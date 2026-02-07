import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'
import { createErrorResponse, ErrorCodes } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { filename } = getQuery(event)
  const safeFilename = (filename as string) || 'image.png'
  console.log('safeFilename', safeFilename)

  // ヘッダーからContentTypeを取得し、なければimage/pngをデフォルトに
  const contentType = getHeader(event, 'content-type') || 'image/png'

  // readRawBodyでバイナリをそのまま取得
  const body = await readRawBody(event, false)

  if (!body) {
    throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, 'データが受信できませんでした')
  }

  try {
    const blob = await put(`uploads/${uuidv4()}_${safeFilename}`, body, {
      access: 'public',
      token: config.blobReadWriteToken,
      contentType: contentType, // 取得したContentTypeを確実に指定
      addRandomSuffix: false // パスを固定するためにfalseを推奨
    })

    console.log('Successfully uploaded with type:', blob.contentType)
    return blob
  } catch (error) {
    console.error('Upload Error:', error)
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, 'アップロードに失敗しました')
  }
})
