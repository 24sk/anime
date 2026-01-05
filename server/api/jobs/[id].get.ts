import { z } from 'zod'
import type { H3Event } from 'h3'
import { getSupabaseClient } from '~~/server/utils/supabase'
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES } from '~~/server/utils/errors'

// UUIDバリデーション用の正規表現
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// パスパラメータのスキーマ定義
const jobIdSchema = z.string().refine(
  val => UUID_REGEX.test(val),
  { message: '無効なジョブIDです' }
)

/**
 * ジョブの状態を取得するエンドポイント（ポーリング用）
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {Promise<{ job_id: string; status: string; result_image_url: string | null; error_message: string | null; created_at: string | null; completed_at: string | null }>} ジョブの状態情報
 */
export default defineEventHandler(async (event: H3Event) => {
  try {
    // パスパラメータからjob_idを取得
    const jobId = getRouterParam(event, 'id')

    if (!jobId) {
      throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, 'ジョブIDが指定されていません')
    }

    // バリデーション
    const validatedJobId = jobIdSchema.parse(jobId)

    // Supabaseからジョブの状態を取得
    const supabase = getSupabaseClient()

    // 型推論の問題を回避するため、型アサーションを使用
    const query = supabase
      .from('generation_jobs')
      .select('id, status, result_image_url, error_message, created_at, completed_at') as unknown as {
      eq: (column: string, value: string) => {
        single: () => Promise<{
          data: {
            id: string
            status: string | null
            result_image_url: string | null
            error_message: string | null
            created_at: string | null
            completed_at: string | null
          } | null
          error: { code?: string } | null
        }>
      }
    }

    const { data: job, error } = await query
      .eq('id', validatedJobId)
      .single()

    if (error) {
      // レコードが見つからない場合（PGRST116はSupabaseの「レコードが見つからない」エラーコード）
      if (error.code === 'PGRST116') {
        throw createErrorResponse(404, ErrorCodes.INTERNAL_SERVER_ERROR, 'ジョブが見つかりません')
      }
      // その他のエラー
      throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR])
    }

    if (!job) {
      throw createErrorResponse(404, ErrorCodes.INTERNAL_SERVER_ERROR, 'ジョブが見つかりません')
    }

    return {
      job_id: job.id,
      status: job.status,
      result_image_url: job.result_image_url,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at
    }
  } catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, error.issues[0]?.message || 'バリデーションエラー')
    }

    // その他のエラー（既にH3Errorの場合はそのままthrow）
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // 予期しないエラー
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR])
  }
})
