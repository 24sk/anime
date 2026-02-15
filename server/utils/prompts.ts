import type { StyleType } from '~~/shared/types/style';

/**
 * ペット画像解析用のシステムプロンプトを生成する
 * LINEスタンプ生成時に渡される画像はアニメ風に変換済みのアイコンであることを考慮し、
 * 外見の特徴を正確に記述させる
 * @returns {string} システムプロンプト
 */
export function getPetAnalysisPrompt(): string {
  return `
You are an expert at analyzing pet character images for LINE sticker generation.
The image you receive may be an anime-style or illustrated version of a real pet.

Please extract the following visual traits in detail so that another AI can reproduce this EXACT character:

1. Species & Breed: Dog, Cat, or specific breed if identifiable.
2. Fur Color & Pattern: Exact fur colors (e.g., "pure white", "cream and light brown"), markings, patterns.
3. Eye Color & Shape: Specific eye color and shape.
4. Distinctive Features: Ear shape (floppy, pointed), tail style, body proportions, nose color, any unique markings.
5. Accessories: Collars, ribbons, clothes, or any worn items.
6. Art Style: Describe the illustration style (e.g., "3D Pixar-style", "flat kawaii", "watercolor").

Output a concise but precise description in English. Focus on visual traits that must be preserved when recreating this character.
Example: "A small white Maltese dog with long fluffy fur, round black eyes, a small black nose, and floppy ears. Rendered in a 3D Pixar-like anime style with soft lighting and expressive features."
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
 * 文言から適切なポーズ・表情の指示を返すヘルパー
 * LINEスタンプは文言に合った感情表現が重要
 */
function getEmotionDirective(label: string): string {
  const emotionMap: Record<string, string> = {
    'おはよう': 'The pet is cheerfully waving one paw with bright, wide-open eyes and a big smile, as if saying good morning.',
    'おやすみ': 'The pet has sleepy, half-closed eyes, yawning or curled up with a peaceful drowsy expression.',
    'ありがとう': 'The pet is bowing slightly with a warm grateful smile, paws together as if thanking someone.',
    'おつかれさま': 'The pet looks gently tired but smiling warmly, giving a thumbs-up or a supportive nod.',
    'いいね！': 'The pet is enthusiastically giving a thumbs-up with sparkling excited eyes and a big grin.',
    'だいすき': 'The pet has heart-shaped eyes or is hugging a heart, with a loving, affectionate expression.',
    'ごめんね': 'The pet looks genuinely apologetic, ears drooping down, eyes looking up with a sad sorry expression, paws together as if begging forgiveness.',
    'バイバイ': 'The pet is happily waving goodbye with one paw raised high, smiling cheerfully.',
    'がんばれ': 'The pet is pumping a fist or cheering with an energetic, encouraging expression.',
    'OK': 'The pet is making an OK sign with its paw, winking with a confident smile.',
    'ありがと': 'The pet is bowing slightly with a warm grateful smile, paws together as if thanking someone.',
    'やったー': 'The pet is jumping with joy, arms raised high, with an ecstatic celebratory expression.',
    'えー': 'The pet has a shocked surprised face with wide eyes and open mouth.',
    'うれしい': 'The pet is beaming with happiness, eyes sparkling, with a pure joyful expression.',
    'かなしい': 'The pet has teary eyes with a sad downcast expression.',
    'おねがい': 'The pet has pleading puppy eyes, paws pressed together in a begging pose.',
    'なるほど': 'The pet has a thoughtful expression, nodding with one paw on chin.',
    'わーい': 'The pet is celebrating excitedly with arms raised and a huge cheerful smile.',
    'すごい': 'The pet is amazed with starry wide eyes and an impressed open-mouth expression.',
    'ファイト': 'The pet is flexing or pumping both fists with a determined, fired-up expression.'
  };

  return emotionMap[label]
    ?? 'The pet has an expressive pose and facial expression that clearly matches the meaning of the displayed text.';
}

/**
 * LINE スタンプ用の画像生成プロンプトを生成する
 * 元画像のペットの外見を忠実に再現し、文言に合った感情表現をつけてスタンプ画像を生成する
 * @param {string} label - スタンプに載せる文言（例: おはよう、ありがとう）
 * @param {string} petDescription - ペットの特徴説明（画像解析結果）
 * @returns {string} 画像生成用プロンプト（英語）
 */
export function getLineStampGenerationPrompt(label: string, petDescription: string, styleType?: StyleType): string {
  const emotionDirective = getEmotionDirective(label);

  // スタイルごとのプロンプト定義（getImageGenerationPromptと共通化すべきだが、一旦ここで定義）
  // LINEスタンプ向けに少し調整しても良い
  const stylePrompts: Record<StyleType, string> = {
    '3d-anime': '3D Pixar-style animated character, cute, adorable, high detail, soft fur, expressive eyes, Disney style, render, 8k, masterpiece.',
    'watercolor': 'Soft watercolor painting, artistic splashes, pastel colors, white background, dreamy, wet-on-wet technique, high quality.',
    'fluffy': 'Cute hand-drawn illustration, fluffy texture, soft lines, pastel colors, warm and cozy vibes, storybook style, adorable.',
    'cyberpunk': 'Cyberpunk pet icon, neon lights, futuristic accessories, vibrant glowing colors, high contrast, sci-fi aesthetic, cool.',
    'korean-style': 'Modern Korean-style pet icon, flat design, vibrant soft colors, simple but cute, charms, stickers, app icon style.',
    'simple-illustration': 'Simple minimalist pet icon, clean lines, flat color, vector art, white background, modern, logo style.'
  };

  // 指定されたスタイルがあればそれを使用、なければデフォルト（ただし "かわいい" 系を強制しすぎない）
  const styleInstruction = styleType && stylePrompts[styleType]
    ? `Style: ${stylePrompts[styleType]}`
    : 'Style: Cute kawaii illustration style with bold outlines, vibrant colors, and simple shading. The style should match popular Japanese LINE stickers.';

  return `Create a single character illustration for a LINE messaging app sticker.

CRITICAL - Pet appearance (must match the reference image exactly):
${petDescription}
You MUST reproduce this exact pet with the same breed, fur color, fur pattern, eye color, and overall appearance as shown in the reference image. Do NOT change the pet's species, color, or distinctive features.

${styleInstruction}

Emotion and pose:
${emotionDirective}

CRITICAL - NO TEXT: Do NOT include ANY text, letters, words, or typography in the image. The image must contain ONLY the pet character with NO text whatsoever.

CRITICAL - Background: The background MUST be a perfectly uniform, solid chroma-key green (#00FF00). It must be completely flat with NO gradients, NO shadows, NO floor shadows, and NO lighting effects on the background. The green must be #00FF00 everywhere.

Layout: The pet character should be centered, occupying about 70-80% of the image area. Leave some padding around the character.

Output: One character-only illustration with a solid, flat green (#00FF00) background, no text.`;
}
