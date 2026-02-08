import { put, del } from '@vercel/blob';

/** 画像アップロード用のパラメータインターフェース */
export interface UploadImageToBlobParams {
  /** アップロードする画像データ（バイナリ） */
  imageData: Buffer;
  /** 匿名セッションID */
  anonSessionId: string;
  /** ジョブID */
  jobId: string;
  /** 画像タイプ */
  type: 'raw' | 'result';
}

/**
 * 画像削除用のパラメータインターフェース
 */
export interface DeleteImageFromBlobParams {
  /** 削除する画像のURL */
  url: string;
}

/**
 * 画像をVercel Blobにアップロードする
 * @param {UploadImageToBlobParams} params - アップロードパラメータ
 * @returns {Promise<{ url: string }>} アップロードされた画像のURL
 */
export async function uploadImageToBlob(
  params: UploadImageToBlobParams
): Promise<{ url: string }> {
  const { imageData, anonSessionId, jobId, type } = params;
  const config = useRuntimeConfig();

  if (!config.blobReadWriteToken) {
    throw new Error('BLOB_READ_WRITE_TOKENが設定されていません');
  }

  // ファイル名の生成（パス構造: uploads/{anon_session_id}/{job_id}_raw.jpg または results/{anon_session_id}/{job_id}_icon.png）
  const extension = type === 'raw' ? 'jpg' : 'png';
  const pathPrefix = type === 'raw' ? 'uploads' : 'results';
  const filename = `${jobId}_${type === 'raw' ? 'raw' : 'icon'}.${extension}`;
  const path = `${pathPrefix}/${anonSessionId}/${filename}`;

  // Vercel Blobにアップロード
  const blob = await put(path, imageData, {
    access: 'public',
    token: config.blobReadWriteToken,
    contentType: type === 'raw' ? 'image/jpeg' : 'image/png'
  });

  return { url: blob.url };
}

/**
 * Vercel Blobから画像を削除する
 * @param {DeleteImageFromBlobParams} params - 削除パラメータ
 */
export async function deleteImageFromBlob(params: DeleteImageFromBlobParams): Promise<void> {
  const { url } = params;
  const config = useRuntimeConfig();

  if (!config.blobReadWriteToken) {
    throw new Error('BLOB_READ_WRITE_TOKENが設定されていません');
  }

  await del(url, {
    token: config.blobReadWriteToken
  });
}
