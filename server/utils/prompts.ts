import type { StyleType } from '~~/shared/types/style';

/**
 * ペット画像解析用のシステムプロンプトを生成する
 * @returns {string} システムプロンプト
 */
export function getPetAnalysisPrompt(): string {
  return `
You are an expert at analyzing pet images.
Please extract the following information from the uploaded pet photo:

1. Breed: Dog, Cat, or specific breed if identifiable.
2. Color/Pattern: Specific fur colors and patterns.
3. Accessories: Presence and description of collars, ribbons, clothes, etc.
4. Expression/Pose: Distinctive expression or pose.

Output the description in English, focusing on visual traits suitable for image generation prompts.
Example: "A Shiba Inu with brown and white fur. Wearing a red collar. Has a gentle expression and is tilting its head slightly."
`;
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
    '3d-anime': '3D Pixar-style animated character, cute, adorable, high detail, soft fur, expressive eyes, Disney style, render, 8k, masterpiece.',
    'watercolor': 'Soft watercolor painting, artistic splashes, pastel colors, white background, dreamy, wet-on-wet technique, high quality.',
    'fluffy': 'Cute hand-drawn illustration, fluffy texture, soft lines, pastel colors, warm and cozy vibes, storybook style, adorable.',
    'cyberpunk': 'Cyberpunk pet icon, neon lights, futuristic accessories, vibrant glowing colors, high contrast, sci-fi aesthetic, cool.',
    'korean-style': 'Modern Korean-style pet icon, flat design, vibrant soft colors, simple but cute, charms, stickers, app icon style.',
    'simple-illustration': 'Simple minimalist pet icon, clean lines, flat color, vector art, white background, modern, logo style.'
  };

  // styleTypeが有効な値でない場合は、デフォルトのsimple-illustrationを使用
  const stylePrompt = stylePrompts[styleType] || stylePrompts['simple-illustration'];

  return `${stylePrompt} Subject: ${petDescription}`;
}

/**
 * LINE スタンプ用の画像生成プロンプトを生成する
 * 元画像のペットをスタンプ風にし、指定文言を大きく表示する
 * @param {string} label - スタンプに載せる文言（例: おはよう、ありがとう）
 * @param {string} petDescription - ペットの特徴説明（画像解析結果）
 * @returns {string} 画像生成用プロンプト（英語）
 */
export function getLineStampGenerationPrompt(label: string, petDescription: string): string {
  return `Create a single LINE sticker image. Style: Cute, simple illustration suitable for LINE stamps. 
Subject: ${petDescription}
The sticker must prominently display the following text in large, readable letters: "${label}".
Layout: The pet character and the text should fit together in one square or horizontal rectangle (sticker format). 
Background: White or simple solid color. No complex scenery.
Output: One image that looks like an official LINE sticker, with the text clearly visible and the pet character in a cute pose.`;
}
