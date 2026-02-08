import type { H3Error } from 'h3'

/**
 * エラーコード定義
 * @remark プロジェクトの一貫性のため、as constパターンを使用
 */
export const ErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
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
  [ErrorCodes.IMAGE_TOO_LARGE]: '画像は4.5MBまでです。別の写真を選んでください。',
  [ErrorCodes.CONTENT_POLICY_VIOLATION]: 'AIの安全ポリシーにより生成できませんでした。別の写真でお試しください。',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: '予期せぬエラーが発生しました。時間を置いてやり直してください。',
  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: 'AIサーバーが一時的に混み合っています。時間を置いてやり直してください。'
}

/**
 * 画像生成バックグラウンド処理で発生したエラーをユーザー向けメッセージに変換する
 * Gemini API の 429（クォータ超過）や 422（セーフティフィルタ）などを検出し、
 * ジョブの error_message に保存する文言を返す
 * @param {unknown} error - キャッチしたエラー
 * @returns {string} ユーザーに表示するメッセージ
 */
export function getUserFacingMessageForGenerationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  // Gemini API の 429 Too Many Requests / クォータ超過
  if (message.includes('429') || message.includes('quota') || message.includes('Quota exceeded')) {
    return ERROR_MESSAGES[ErrorCodes.AI_SERVICE_UNAVAILABLE]
  }

  // セーフティフィルタ・コンテンツポリシー（422 相当）
  if (
    message.includes('SAFETY') ||
    message.includes('blocked') ||
    message.includes('policy') ||
    message.includes('Content policy')
  ) {
    return ERROR_MESSAGES[ErrorCodes.CONTENT_POLICY_VIOLATION]
  }

  return ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]
}
