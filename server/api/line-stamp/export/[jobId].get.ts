import type { H3Event } from 'h3';
import { z } from 'zod';
import { getSupabaseClient } from '~~/server/utils/supabase';
import {
  createErrorResponse,
  ErrorCodes,
  ERROR_MESSAGES
} from '~~/server/utils/errors';

/**
 * パスパラメータ（jobId）のバリデーションスキーマ
 */
const jobIdSchema = z.string().uuid({ message: '無効なジョブIDです' });

/**
 * line_stamp_jobs テーブルからジョブ情報を取得する
 * @param jobId - ジョブID（UUID）
 */
async function fetchLineStampJob(jobId: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseClient();

  // 型推論の問題を回避するため、rate-limit.ts と同様に型アサーションを用いる
  const query = supabase
    .from('line_stamp_jobs')
    .select(
      [
        'id',
        'anon_session_id',
        'image_url',
        'texts',
        'stamp_count',
        'include_main_and_tab',
        'status',
        'progress',
        'error_message',
        'main_image_url',
        'tab_image_url',
        'zip_url',
        'created_at',
        'updated_at'
      ].join(',')
    ) as unknown as {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{
        data: Record<string, unknown> | null;
        error: { code?: string; message?: string } | null;
      }>;
    };
  };

  const { data, error } = await query.eq('id', jobId).maybeSingle();

  if (error) {
    console.error('[line-stamp/export/:jobId] select error:', {
      code: error.code,
      message: error.message
    });
    throw createErrorResponse(
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]
    );
  }

  return data;
}

/**
 * LINEスタンプバッチ生成ジョブの進捗・結果を取得するエンドポイント
 *
 * - クライアントは POST /api/line-stamp/export で取得した job_id を用いて本エンドポイントをポーリングし、
 *   status（pending / processing / completed / failed）に応じて UI を更新する想定。
 * - 実際の画像生成処理は line-stamp-automation などのワーカーが Supabase の line_stamp_jobs を更新する。
 */
export default defineEventHandler(async (event: H3Event) => {
  try {
    const { jobId: rawJobId } = getRouterParams(event);
    const jobId = jobIdSchema.parse(rawJobId);

    const job = await fetchLineStampJob(jobId);

    if (!job) {
      throw createErrorResponse(
        404,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        '指定されたジョブが見つかりませんでした'
      );
    }

    /**
     * APIレスポンスは、line-stamp-automation 側の実装と連携しやすいように
     * 汎用的な構造に整形して返す。
     *
     * - job_id: ジョブID
     * - status: 'pending' | 'processing' | 'completed' | 'failed'
     * - progress: 0〜100 の進捗率（任意）
     * - stamp_count: 目標スタンプ枚数
     * - include_main_and_tab: メイン画像・タブ画像を含めるか
     * - texts: 文言配列（ワーカーが必要に応じてステータス・URL等を格納する想定）
     * - main_image_url / tab_image_url: メイン・タブ画像のURL
     * - zip_url: 生成されたZIPの署名付きURL
     * - error_message: 失敗時のメッセージ
     * - created_at / updated_at: タイムスタンプ
     */
    return {
      job_id: job.id,
      status: job.status,
      progress: job.progress ?? null,
      stamp_count: job.stamp_count,
      include_main_and_tab: job.include_main_and_tab,
      texts: job.texts ?? [],
      main_image_url: job.main_image_url ?? null,
      tab_image_url: job.tab_image_url ?? null,
      zip_url: job.zip_url ?? null,
      error_message: job.error_message ?? null,
      created_at: job.created_at,
      updated_at: job.updated_at
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createErrorResponse(
        400,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        error.issues[0]?.message ?? 'バリデーションエラー'
      );
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[line-stamp/export/:jobId] Unexpected error:', message);

    throw createErrorResponse(
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]
    );
  }
});
