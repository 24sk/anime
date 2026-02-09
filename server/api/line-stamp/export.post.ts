import { z } from 'zod';
import type { H3Event } from 'h3';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '~~/server/utils/rate-limit';
import {
  createErrorResponse,
  ErrorCodes,
  ERROR_MESSAGES
} from '~~/server/utils/errors';
import { checkLineStampDailyLimit, LINE_STAMP_DAILY_LIMIT } from '~~/server/utils/stamp-limit';
import { MAX_LINE_STAMP_PER_REQUEST } from '~~/shared/constants/line-stamp';
import { getSupabaseClient } from '~~/server/utils/supabase';

/**
 * LINEスタンプのバッチ生成ジョブ作成用リクエストボディのスキーマ
 * - Phase 2 仕様に基づき、複数文言・スタンプ枚数・メイン/タブ画像同梱フラグを受け取る
 * - 実際に生成するスタンプ枚数は texts.length と stamp_count の小さい方とし、
 *   日次レート制限（generated_stamp_counts）ではその枚数分をカウントする
 */
const exportRequestSchema = z
  .object({
    anon_session_id: z
      .string()
      .uuid({ message: '無効なセッションIDです' }),
    image_url: z
      .string()
      .url({ message: '無効な画像URLです' }),
    texts: z
      .array(
        z
          .string()
          .min(1, '文言を入力してください')
          .max(20, '文言は最大20文字までです')
      )
      .min(1, '少なくとも1つ以上の文言を指定してください'),
    stamp_count: z
      .number()
      .int()
      .min(1)
      .max(MAX_LINE_STAMP_PER_REQUEST),
    include_main_and_tab: z.boolean().optional().default(true)
  })
  .refine(
    data => data.texts.length <= data.stamp_count,
    { message: '選択された文言数が作成するスタンプ数を超えています' }
  );

/**
 * Supabase の line_stamp_jobs テーブルに新しいジョブを作成する
 * @param event - H3 イベント
 * @param payload - バリデーション済みリクエストボディ
 * @param plannedCount - 今回のバッチで生成を試みるスタンプ枚数
 */
async function createLineStampJob(
  event: H3Event,
  payload: z.infer<typeof exportRequestSchema>,
  plannedCount: number
): Promise<{ jobId: string }> {
  const supabase = getSupabaseClient();
  const jobId = uuidv4();
  const now = new Date().toISOString();

  /**
   * line_stamp_jobs テーブルの想定スキーマ（設計ドキュメントに準拠）
   * - id: UUID（PK）
   * - anon_session_id: UUID
   * - image_url: TEXT
   * - texts: JSONB（文言の配列）
   * - stamp_count: INTEGER
   * - include_main_and_tab: BOOLEAN
   * - status: TEXT ('pending' | 'processing' | 'completed' | 'failed')
   * - progress: INTEGER（0-100）
   * - error_message: TEXT
   * - created_at / updated_at: TIMESTAMPTZ
   *
   * 実際のテーブル定義は Supabase 側のマイグレーションで作成する想定のため、
   * ここでは any ベースで insert クエリを構築する。
   */
  // 型推論の問題を回避するため、rate-limit.ts と同様に型アサーションを用いる
  const insertQuery = supabase.from('line_stamp_jobs') as unknown as {
    insert: (data: Record<string, unknown>) => Promise<{
      error: { code?: string; message?: string } | null;
    }>;
  };

  const insertPayload: Record<string, unknown> = {
    id: jobId,
    anon_session_id: payload.anon_session_id,
    image_url: payload.image_url,
    texts: payload.texts,
    stamp_count: plannedCount,
    include_main_and_tab: payload.include_main_and_tab ?? true,
    status: 'pending',
    progress: 0,
    error_message: null,
    created_at: now,
    updated_at: now
  };

  const { error } = await insertQuery.insert(insertPayload);

  if (error) {
    // Supabase 側のエラー内容はログに残しつつ、ユーザーには一般的なエラーメッセージを返す
    console.error('[line-stamp/export] failed to insert job:', {
      code: error.code,
      message: error.message
    });
    throw createErrorResponse(
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]
    );
  }

  return { jobId };
}

/**
 * LINEスタンプのバッチ生成ジョブを作成するエンドポイント
 * - 非同期ジョブ方式: 即時に Supabase にジョブを登録し、{ job_id } を返す
 * - 実際の画像生成処理は別のワーカー（例: line-stamp-automation CLI）で行う前提
 * - 認可ロジック（サブスク契約者限定）は、まだログイン機能がないため本実装ではスキップする
 *
 * @returns { job_id: string } 生成されたジョブID
 */
export default defineEventHandler(async (event: H3Event) => {
  try {
    // IPアドレス単位のレートリミット（24時間で最大200リクエスト程度）をチェック
    const rateLimitResult = await checkRateLimit(event);
    if (!rateLimitResult.allowed) {
      setResponseStatus(event, 429);
      setHeader(event, 'X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW));
      setHeader(event, 'X-RateLimit-Remaining', String(rateLimitResult.remaining));
      setHeader(
        event,
        'X-RateLimit-Reset',
        String(Math.floor(rateLimitResult.resetAt.getTime() / 1000))
      );
      throw createErrorResponse(
        429,
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        ERROR_MESSAGES[ErrorCodes.RATE_LIMIT_EXCEEDED]
      );
    }

    const body = await readBody(event);
    const validated = exportRequestSchema.parse(body);

    // 実際に生成を試みるスタンプ枚数（texts.length と stamp_count の小さい方）
    const plannedCount = Math.min(validated.texts.length, validated.stamp_count);

    // 日次レート制限（1ユーザーあたり40枚/日）をチェック
    const dailyLimitResult = await checkLineStampDailyLimit(
      event,
      validated.anon_session_id,
      plannedCount
    );
    if (!dailyLimitResult.allowed) {
      setResponseStatus(event, 429);
      throw createErrorResponse(
        429,
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        `本日のLINEスタンプ生成上限（${LINE_STAMP_DAILY_LIMIT}枚）に達しました。明日またお試しください。`
      );
    }

    // Supabase にジョブを登録（実際の処理は別ワーカーが line-stamp-automation を用いて実行する）
    const { jobId } = await createLineStampJob(event, validated, plannedCount);

    // ジョブIDのみを返し、クライアントは別エンドポイントから進捗・結果を取得する
    return { job_id: jobId };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createErrorResponse(
        400,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        error.issues[0]?.message ?? 'バリデーションエラー'
      );
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      // createErrorResponse など既存のエラーオブジェクトはそのまま投げ直す
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[line-stamp/export] Unexpected error:', message);

    throw createErrorResponse(
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]
    );
  }
});
