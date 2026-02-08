import { z } from 'zod';
import type { H3Event } from 'h3';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '~~/server/utils/rate-limit';
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES, getUserFacingMessageForGenerationError } from '~~/server/utils/errors';
import { getSupabaseClient } from '~~/server/utils/supabase';
import { getImageGenerationPrompt } from '~~/server/utils/prompts';
import { analyzePetImage, generateImageWithImagen } from '~~/server/utils/gemini';
import { uploadImageToBlob, deleteImageFromBlob } from '~~/server/utils/blob';
import { styleTypes } from '~~/shared/types/style';

// UUIDバリデーション用の正規表現
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// リクエストボディのスキーマ定義
const generateRequestSchema = z.object({
  anon_session_id: z.string().refine(
    val => UUID_REGEX.test(val),
    { message: '無効なセッションIDです' }
  ),
  source_image_url: z.string().refine(
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
  style_type: z.enum(styleTypes)
});

/**
 * 画像生成リクエストを処理するエンドポイント
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {Promise<{ job_id: string; status: string }>} ジョブIDとステータス
 */
export default defineEventHandler(async (event: H3Event) => {
  try {
    // レートリミットチェック（最初に実行）
    const rateLimitResult = await checkRateLimit(event);

    if (!rateLimitResult.allowed) {
      // レートリミット超過時は429エラーを返す
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

    // レートリミット情報をレスポンスヘッダーに追加（デバッグ用）
    setHeader(event, 'X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR));
    setHeader(event, 'X-RateLimit-Remaining', String(rateLimitResult.remaining));
    setHeader(event, 'X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)));

    // リクエストボディを取得
    const body = await readBody(event);

    // Zodスキーマでバリデーション
    const validatedData = generateRequestSchema.parse(body);

    // ジョブIDの生成
    const jobId = uuidv4();

    // Supabaseにジョブを作成
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('generation_jobs')
      .insert({
        id: jobId,
        anon_session_id: validatedData.anon_session_id,
        source_image_url: validatedData.source_image_url,
        style_type: validatedData.style_type,
        status: 'pending'
      });

    if (error) {
      throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]);
    }

    // 即座に processing に更新（waitUntil がサーバーレスで実行されない場合でも pending で残らないよう、レスポンス返却前に更新）
    const { error: processingError } = await supabase
      .from('generation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    if (processingError) {
      console.error('[generate] Failed to set job to processing:', processingError);
    }

    // 非同期で画像生成処理を開始（バックグラウンド処理）
    // event.waitUntil()を使用することで、レスポンス送信後も処理を継続できます
    // これがないと、サーバーレス環境ではレスポンス送信後にインスタンスが即座に終了し、AI生成が中断される恐れがあります
    event.waitUntil(
      (async () => {
        try {
          // 画像生成処理
          // 画像解析: ペットの特徴を抽出
          const petDescription = await analyzePetImage(validatedData.source_image_url);
          // プロンプト生成: スタイルタイプとペットの特徴から画像生成用プロンプトを生成
          const prompt = getImageGenerationPrompt(validatedData.style_type as typeof styleTypes[number], petDescription);

          // モデル選択
          // 3Dアニメの場合は Imagen 4 を使用、それ以外は Gemini 2.5 Flash Image を使用
          let modelName = 'gemini-2.5-flash-image';
          if (validatedData.style_type === '3d-anime') {
            modelName = 'imagen-4.0-generate-001';
          }

          // 画像生成
          const generatedImage = await generateImageWithImagen(validatedData.source_image_url, prompt, modelName);

          // 生成画像をVercel Blobにアップロード
          const { url: resultUrl } = await uploadImageToBlob({
            imageData: generatedImage,
            anonSessionId: validatedData.anon_session_id,
            jobId,
            type: 'result'
          });

          // ステータスをcompletedに更新
          await supabase
            .from('generation_jobs')
            .update({
              status: 'completed',
              result_image_url: resultUrl,
              completed_at: new Date().toISOString()
            })
            .eq('id', jobId);
        } catch (error) {
          // エラー発生時の処理（429 クォータ超過なども確実に failed にし、ユーザー向けメッセージを保存）
          const errorMessage = getUserFacingMessageForGenerationError(error);
          const rawMessage = error instanceof Error ? error.message : String(error);
          console.error('[generate] Background job failed:', rawMessage);

          // エラー発生時はVercel Blobの画像を削除（クリーンアップ）
          try {
            if (validatedData.source_image_url) {
              await deleteImageFromBlob({ url: validatedData.source_image_url });
            }
          } catch (deleteError) {
            console.error('Failed to delete image from blob:', deleteError);
          }

          // ステータスを必ず failed に更新（pending/processing のまま残さない）
          const { error: updateError } = await supabase
            .from('generation_jobs')
            .update({
              status: 'failed',
              error_message: errorMessage
            })
            .eq('id', jobId);

          if (updateError) {
            console.error('[generate] Failed to update job status to failed:', updateError);
          }
        }
      })()
    );

    // 202 Accepted を返す
    setResponseStatus(event, 202);
    return {
      job_id: jobId,
      status: 'pending'
    };
  } catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, error.issues[0]?.message || 'バリデーションエラー');
    }

    // Gemini APIのセーフティフィルタによる拒否の場合
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 422) {
      throw createErrorResponse(422, ErrorCodes.CONTENT_POLICY_VIOLATION, ERROR_MESSAGES[ErrorCodes.CONTENT_POLICY_VIOLATION]);
    }

    // その他のエラー（既にH3Errorの場合はそのままthrow）
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // 予期しないエラー：原因特定のためサーバーログに記録（機密情報は含めない）
    console.error('[generate] Unexpected error:', error instanceof Error ? error.message : String(error));
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR]);
  }
});
