import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPetAnalysisPrompt } from './prompts'

/**
 * Gemini APIクライアントを初期化する
 * @returns {GoogleGenerativeAI} Gemini APIクライアントインスタンス
 */
export function getGeminiClient() {
  const config = useRuntimeConfig()

  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません')
  }

  return new GoogleGenerativeAI(config.geminiApiKey)
}

/**
 * 外部URLの画像をGemini用のBase64データに変換する
 * @param {string} imageUrl - 画像のURL
 */
async function fetchImageAsBase64(imageUrl: string) {
  const response = await $fetch<Blob>(imageUrl)
  const arrayBuffer = await response.arrayBuffer()
  return {
    inlineData: {
      data: Buffer.from(arrayBuffer).toString('base64'),
      mimeType: response.type
    }
  }
}

/**
 * 画像を解析してペットの特徴を抽出する
 * @param {string} imageUrl - 解析する画像のURL
 * @returns {Promise<string>} 抽出されたペットの特徴（テキスト）
 */
export async function analyzePetImage(imageUrl: string): Promise<string> {
  const genAI = getGeminiClient()
  // 最新のモデル: gemini-2.0-flash
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // 画像データの取得
  const imageData = await fetchImageAsBase64(imageUrl)

  // システムプロンプトの取得
  const systemInstruction = getPetAnalysisPrompt()

  // 画像解析の実行
  const result = await model.generateContent([systemInstruction, imageData])
  const response = await result.response
  return response.text()
}

/**
 * Gemini の画像生成モデル（Nano Banana）で画像を生成する
 * 元画像 + プロンプトから image-to-image でアイコンを生成する
 * @param {string} sourceImageUrl - 元画像のURL（参考用）
 * @param {string} prompt - 画像生成用プロンプト
 * @returns {Promise<Buffer>} 生成された画像データ（バイナリ）
 */
export async function generateImageWithImagen(
  sourceImageUrl: string,
  prompt: string
): Promise<Buffer> {
  const genAI = getGeminiClient()

  // Gemini 画像生成モデル（Nano Banana / gemini-2.5-flash-image）を使用
  // Imagen 3（imagen-3.0-generate-001）は generativelanguage API の generateContent 非対応のため未使用
  // https://ai.google.dev/gemini-api/docs/image-generation
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
    generationConfig: {
      // 画像出力を明示的に要求（レスポンスに IMAGE を含める）
      responseModalities: ['TEXT', 'IMAGE']
    } as Record<string, unknown>
  })

  // 元画像の特徴をより反映させるため、画像データも一緒に送信
  const imageData = await fetchImageAsBase64(sourceImageUrl)

  try {
    const result = await model.generateContent([prompt, imageData])
    const response = await result.response

    // 生成された画像のバイナリデータを取得
    // テキストが先に返る場合があるため、parts 全体から inlineData を持つ part を探す
    const parts = response.candidates?.[0]?.content?.parts ?? []
    let imageBytes: string | undefined
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageBytes = part.inlineData.data
        break
      }
    }

    if (!imageBytes) {
      throw new Error('画像の生成結果が空です。セーフティフィルタに抵触した可能性があります。')
    }

    return Buffer.from(imageBytes, 'base64')
  } catch (error) {
    console.error('Image Generation Error:', error)
    throw error
  }
}
