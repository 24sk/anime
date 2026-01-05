import type { H3Error } from 'h3'

/**
 * エラーコード定義
 * @remark プロジェクトの一貫性のため、as constパターンを使用
 */
export const ErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE'
} as const

/**
 * エラーコードの型
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * エラーレスポンスを生成する
 * @param {number} statusCode - HTTPステータスコード
 * @param {ErrorCode} errorCode - エラーコード
 * @param {string} message - エラーメッセージ
 * @returns {H3Error} H3エラーオブジェクト
 */
export function createErrorResponse(
  statusCode: number,
  errorCode: ErrorCode,
  message: string
): H3Error {
  return createError({
    statusCode,
    statusMessage: errorCode,
    data: {
      code: errorCode,
      message
    }
  })
}

/**
 * ユーザーフレンドリーなエラーメッセージマッピング
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
  [ErrorCodes.INVALID_IMAGE_FORMAT]: '対応していない画像形式です。JPGまたはPNGを使用してください。',
  [ErrorCodes.CONTENT_POLICY_VIOLATION]: 'AIの安全ポリシーにより生成できませんでした。別の写真でお試しください。',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: '予期せぬエラーが発生しました。時間を置いてやり直してください。',
  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: 'AIサーバーが一時的に混み合っています。時間を置いてやり直してください。'
}
