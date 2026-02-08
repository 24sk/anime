import { z } from 'zod';
import type { H3Event } from 'h3';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '~~/server/utils/rate-limit';
import {
  createErrorResponse,
  ErrorCodes,
  ERROR_MESSAGES,
  getUserFacingMessageForGenerationError
} from '~~/server/utils/errors';
import { analyzePetImage, generateImageWithImagen } from '~~/server/utils/gemini';
import { uploadImageToBlob } from '~~/server/utils/blob';
import { getLineStampGenerationPrompt } from '~~/server/utils/prompts';
import { STAMP_WORDS } from '~~/shared/constants/line-stamp';

/** 自由入力文言の最大文字数（フロントと一致） */
const CUSTOM_LABEL_MAX_LENGTH = 20;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const generateRequestSchema = z
  .object({
    anon_session_id: z.string().refine(val => UUID_REGEX.test(val), {
      message: '無効なセッションIDです'
    }),
    image_url: z.string().refine(
      (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: '無効な画像URLです' }
    ),
    word_id: z.string().optional(),
    custom_label: z.string().max(CUSTOM_LABEL_MAX_LENGTH).optional()
  })
  .refine(
    (data) => {
      const hasWordId = data.word_id != null && data.word_id !== '';
      const hasCustom = data.custom_label != null && data.custom_label.trim() !== '';
      return (hasWordId && !hasCustom) || (!hasWordId && hasCustom);
    },
    { message: 'word_id と custom_label のどちらか一方のみ指定してください' }
  );

/**
 * LINE スタンプ 1 枚を AI で生成する
 * 元画像＋1 文言を AI に渡し、スタンプ画像を生成して URL を返す（同期処理）
 * @param event - H3 イベント
 * @returns { result_image_url: string }
 */
export default defineEventHandler(async (event: H3Event) => {
  try {
    const rateLimitResult = await checkRateLimit(event);
    if (!rateLimitResult.allowed) {
      setResponseStatus(event, 429);
      setHeader(event, 'X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR));
      setHeader(event, 'X-RateLimit-Remaining', String(rateLimitResult.remaining));
      setHeader(event, 'X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)));
      throw createErrorResponse(
        429,
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        ERROR_MESSAGES[ErrorCodes.RATE_LIMIT_EXCEEDED]
      );
    }

    const body = await readBody(event);
    const validated = generateRequestSchema.parse(body);

    // 使用する文言を決定（プリセットの label または custom_label）
    let label: string;
    if (validated.custom_label != null && validated.custom_label.trim() !== '') {
      label = validated.custom_label.trim();
    } else {
      const word = STAMP_WORDS.find(w => w.id === validated.word_id);
      if (!word) {
        throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, '指定された単語が見つかりません');
      }
      label = word.label;
    }

    // 画像解析（ペットの特徴を抽出）
    const petDescription = await analyzePetImage(validated.image_url);

    // スタンプ用プロンプト生成
    const prompt = getLineStampGenerationPrompt(label, petDescription);

    // 画像生成（既存の Gemini 画像生成モデルを使用）
    const modelName = 'gemini-2.5-flash-image';
    const generatedImage = await generateImageWithImagen(validated.image_url, prompt, modelName);

    // Vercel Blob にアップロード（line_stamps パス）
    const stampId = uuidv4();
    const { url: resultUrl } = await uploadImageToBlob({
      imageData: generatedImage,
      anonSessionId: validated.anon_session_id,
      jobId: stampId,
      type: 'line_stamp'
    });

    return { result_image_url: resultUrl };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createErrorResponse(
        400,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        error.issues[0]?.message ?? 'バリデーションエラー'
      );
    }
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 422) {
      throw createErrorResponse(
        422,
        ErrorCodes.CONTENT_POLICY_VIOLATION,
        ERROR_MESSAGES[ErrorCodes.CONTENT_POLICY_VIOLATION]
      );
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[line-stamp/generate] Error:', message);

    // ユーザー向けメッセージに変換して 500 で返す（既存の generate は 202 でジョブ登録なので、ここは同期のため 500）
    const userMessage = getUserFacingMessageForGenerationError(error);
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, userMessage);
  }
});
