import { createHash } from 'crypto';
import type { H3Event } from 'h3';
import { getSupabaseClient } from './supabase';
import type { Database } from '../../shared/types/database.types';

type RateLimitRow = Database['public']['Tables']['rate_limits']['Row'];
type RateLimitInsert = Database['public']['Tables']['rate_limits']['Insert'];
type RateLimitUpdate = Database['public']['Tables']['rate_limits']['Update'];

/**
 * レートリミット設定
 * - 同一IPアドレスあたり 24時間で最大200リクエストまで許可する
 * - 画像生成API全体のセーフティネットとして利用し、LINEスタンプ生成の
 *   「IPアドレス単位で200枚/日程度」の要件もこの設定で満たす
 * @remark 必要になれば環境変数から読み込むように拡張する
 */
export const RATE_LIMIT_CONFIG = {
  // 1つのレートリミットウィンドウ内の最大リクエスト数
  MAX_REQUESTS_PER_WINDOW: 200,
  // ウィンドウ長（ミリ秒）: 24時間
  WINDOW_MS: 24 * 60 * 60 * 1000
} as const;

/**
 * リクエストのIPアドレスを取得する
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {string} IPアドレス
 */
function getClientIP(event: H3Event): string {
  // X-Forwarded-Forヘッダーから取得（プロキシ経由の場合）
  const forwardedFor = getHeader(event, 'x-forwarded-for');
  if (forwardedFor) {
    // 複数のIPが含まれる場合は最初のIPを使用
    return forwardedFor?.split(',')[0]?.trim() || 'unknown';
  }

  // X-Real-IPヘッダーから取得
  const realIP = getHeader(event, 'x-real-ip');
  if (realIP) {
    return realIP;
  }

  // 直接接続の場合
  return event.node.req.socket.remoteAddress || 'unknown';
}

/**
 * IPアドレスをハッシュ化する（プライバシー保護）
 * @param {string} ip - IPアドレス
 * @returns {string} ハッシュ化されたIPアドレス
 */
function hashIP(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * レートリミットチェックを実行する
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {Promise<{ allowed: boolean; remaining: number; resetAt: Date }>} チェック結果
 */
export async function checkRateLimit(
  event: H3Event
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const clientIP = getClientIP(event);
  const ipHash = hashIP(clientIP);
  const supabase = getSupabaseClient();

  // 現在の時刻
  const now = new Date();
  const resetAt = new Date(now.getTime() + RATE_LIMIT_CONFIG.WINDOW_MS);

  // rate_limitsテーブルから現在のレートリミット情報を取得
  // 型推論の問題を回避するため、型アサーションを使用
  const query = supabase
    .from('rate_limits')
    .select('ip_hash, request_count, last_request_at') as unknown as {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: RateLimitRow | null; error: { code?: string } | null }>;
    };
  };
  const { data: rateLimitData, error: selectError } = await query
    .eq('ip_hash', ipHash)
    .maybeSingle();

  if (selectError) {
    // エラーはログに記録して、レートリミットチェックをスキップ（サービス継続性のため）
    console.error('Rate limit check error:', selectError);
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW, resetAt };
  }

  if (!rateLimitData) {
    // 初回リクエストの場合、新規レコードを作成
    const insertData: RateLimitInsert = {
      ip_hash: ipHash,
      request_count: 1,
      last_request_at: now.toISOString()
    };
    // 型推論の問題を回避するため、型アサーションを使用
    const insertQuery = supabase.from('rate_limits') as unknown as {
      insert: (data: RateLimitInsert) => Promise<{ error: { code?: string } | null }>;
    };
    const { error: insertError } = await insertQuery.insert(insertData);

    if (insertError) {
      console.error('Rate limit insert error:', insertError);
      // エラー時はレートリミットチェックをスキップ
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW, resetAt };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW - 1,
      resetAt
    };
  }

  // 最終リクエストからの経過時間を計算
  if (!rateLimitData.last_request_at) {
    // last_request_atがnullの場合は、新規レコードとして扱う
    const updateData: RateLimitUpdate = {
      request_count: 1,
      last_request_at: now.toISOString()
    };
    // 型推論の問題を回避するため、型アサーションを使用
    const updateQuery = (supabase.from('rate_limits') as unknown as {
      update: (data: RateLimitUpdate) => {
        eq: (column: string, value: string) => Promise<{ error: { code?: string } | null }>;
      };
    }).update(updateData);
    const { error: updateError } = await updateQuery.eq('ip_hash', ipHash);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW, resetAt };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW - 1,
      resetAt
    };
  }

  const lastRequestAt = new Date(rateLimitData.last_request_at);
  const timeSinceLastRequest = now.getTime() - lastRequestAt.getTime();

  // レートリミットウィンドウを超えている場合はカウントをリセット
  if (timeSinceLastRequest >= RATE_LIMIT_CONFIG.WINDOW_MS) {
    const updateData: RateLimitUpdate = {
      request_count: 1,
      last_request_at: now.toISOString()
    };
    // 型推論の問題を回避するため、型アサーションを使用
    const updateQuery = (supabase.from('rate_limits') as unknown as {
      update: (data: RateLimitUpdate) => {
        eq: (column: string, value: string) => Promise<{ error: { code?: string } | null }>;
      };
    }).update(updateData);
    const { error: updateError } = await updateQuery.eq('ip_hash', ipHash);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW, resetAt };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW - 1,
      resetAt
    };
  }

  // リクエスト数が上限に達しているかチェック
  const requestCount = rateLimitData.request_count ?? 0;
  if (requestCount >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(lastRequestAt.getTime() + RATE_LIMIT_CONFIG.WINDOW_MS)
    };
  }

  // リクエスト数をインクリメント
  const updateData: RateLimitUpdate = {
    request_count: requestCount + 1,
    last_request_at: now.toISOString()
  };
  // 型推論の問題を回避するため、型アサーションを使用
  const updateQuery = (supabase.from('rate_limits') as unknown as {
    update: (data: RateLimitUpdate) => {
      eq: (column: string, value: string) => Promise<{ error: { code?: string } | null }>;
    };
  }).update(updateData);
  const { error: updateError } = await updateQuery.eq('ip_hash', ipHash);

  if (updateError) {
    console.error('Rate limit update error:', updateError);
    // エラー時はレートリミットチェックをスキップ
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW, resetAt };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW - (requestCount + 1),
    resetAt: new Date(lastRequestAt.getTime() + RATE_LIMIT_CONFIG.WINDOW_MS)
  };
}
