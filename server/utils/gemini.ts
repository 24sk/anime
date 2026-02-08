import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPetAnalysisPrompt } from './prompts';

/**
 * Gemini APIクライアントを初期化する
 * @returns {GoogleGenerativeAI} Gemini APIクライアントインスタンス
 */
export function getGeminiClient() {
  const config = useRuntimeConfig();

  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません');
  }

  return new GoogleGenerativeAI(config.geminiApiKey);
}

/**
 * 外部URLの画像をGemini用のBase64データに変換する
 * @param {string} imageUrl - 画像のURL
 */
async function fetchImageAsBase64(imageUrl: string) {
  const response = await $fetch<Blob>(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(arrayBuffer).toString('base64'),
      mimeType: response.type
    }
  };
}

/**
 * 画像を解析してペットの特徴を抽出する
 * @param {string} imageUrl - 解析する画像のURL
 * @returns {Promise<string>} 抽出されたペットの特徴（テキスト）
 */
export async function analyzePetImage(imageUrl: string): Promise<string> {
  const genAI = getGeminiClient();
  // 最新のモデル: gemini-2.0-flash
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 画像データの取得
  const imageData = await fetchImageAsBase64(imageUrl);

  // システムプロンプトの取得
  const systemInstruction = getPetAnalysisPrompt();

  // 画像解析の実行
  const result = await model.generateContent([systemInstruction, imageData]);
  const response = await result.response;
  return response.text();
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
  prompt: string,
  modelName: string = 'gemini-2.5-flash-image'
): Promise<Buffer> {
  const config = useRuntimeConfig();

  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  // --- Imagen Models: Use REST API (predict) ---
  if (modelName.includes('imagen')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${config.geminiApiKey}`;

    const requestBody = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1
      }
    };

    console.log(`Generating image with model: ${modelName} via REST API (predict)`);
    console.log('Prompt:', prompt);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          throw new Error(`Imagen API Error: ${errorJson.error.message}`);
        }
      } catch {
        // JSONパースに失敗した場合はそのままエラーテキストを使用
      }
      throw new Error(`Imagen API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    };
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      if (data.predictions?.[0]?.mimeType && data.predictions?.[0]?.bytesBase64Encoded) {
        return Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
      }
      console.error('API Response for debugging:', JSON.stringify(data, null, 2));
      throw new Error('No image returned from Imagen API');
    }

    return Buffer.from(base64Image, 'base64');
  }

  // --- Gemini Models: Use SDK (generateContent) ---
  const genAI = getGeminiClient();

  // Gemini 画像生成モデル（Nano Banana / gemini-2.5-flash-image）を使用
  // Imagen 3（imagen-3.0-generate-001）は generativelanguage API の generateContent 非対応のため未使用
  // https://ai.google.dev/gemini-api/docs/image-generation
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      // 画像出力を明示的に要求（レスポンスに IMAGE を含める）
      responseModalities: ['TEXT', 'IMAGE']
    } as Record<string, unknown>
  });

  console.log(`Generating image with model: ${modelName} via SDK (generateContent)`);
  console.log('prompt', prompt);

  // 元画像の特徴をより反映させるため、画像データも一緒に送信
  const imageData = await fetchImageAsBase64(sourceImageUrl);

  try {
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;

    // 生成された画像のバイナリデータを取得
    // テキストが先に返る場合があるため、parts 全体から inlineData を持つ part を探す
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    let imageBytes: string | undefined;
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageBytes = part.inlineData.data;
        break;
      }
    }

    if (!imageBytes) {
      throw new Error('画像の生成結果が空です。セーフティフィルタに抵触した可能性があります。');
    }

    return Buffer.from(imageBytes, 'base64');
  } catch (error) {
    console.error('Image Generation Error:', error);
    throw error;
  }
}
