import type { StyleType } from '~~/shared/types/style'
import { styleTypes } from '~~/shared/types/style'

/**
 * ペット画像解析用のシステムプロンプトを生成する
 * @returns {string} システムプロンプト
 */
export function getPetAnalysisPrompt(): string {
  return `
あなたはペットの特徴を分析する専門家です。
アップロードされたペットの写真から、以下の情報を抽出してください：

1. 種類: 犬、猫、その他のペットの種類
2. 毛色・模様: 具体的な色や模様の特徴
3. 装飾品: 首輪、リボン、バンダナなどの装飾品の有無と特徴
4. 表情・ポーズ: 特徴的な表情やポーズ

抽出した情報は、30代の飼い主が「うちの子」を表現するために使える、温かみのある日本語で記述してください。
例：「茶色と白のまだら模様の柴犬。首に赤い首輪をしています。優しい目をしており、少し首をかしげたポーズです。」
`
}

/**
 * スタイルタイプに基づいて画像生成用のプロンプトを生成する
 * @param {StyleType} styleType - スタイルタイプ
 * @param {string} petDescription - ペットの特徴説明（画像解析結果）
 * @returns {string} 画像生成用プロンプト（英語）
 */
export function getImageGenerationPrompt(
  styleType: StyleType,
  petDescription: string
): string {
  const stylePrompts: Record<StyleType, string> = {
    '3d-anime': 'Transform this pet into a 3D Pixar-style animated character. High detail, soft fur, expressive eyes.',
    'watercolor': 'Create a soft watercolor painting of this pet. Artistic splashes, pastel colors, white background.',
    'fluffy': 'A cute, hand-drawn fluffy illustration. Warm and cozy vibes, simple lines.',
    'cyberpunk': 'Cool cyberpunk pet icon. Neon lights, futuristic accessories, vibrant glowing colors.',
    'korean-style': 'Create a modern Korean-style pet icon. Vibrant colors, smooth gradients, cute and charming design, popular K-pop aesthetic.',
    'simple-illustration': 'Create a simple, minimalist pet icon. Clean lines, solid colors, white or transparent background, modern and versatile.'
  }

  // styleTypeが有効な値でない場合は、デフォルトのsimple-illustrationを使用
  const stylePrompt = stylePrompts[styleType] || stylePrompts[styleTypes[styleTypes.length - 1]]

  return `${stylePrompt} Based on: ${petDescription}`
}
