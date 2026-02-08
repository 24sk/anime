import { put, del } from '@vercel/blob';

/** 画像アップロード用の画像タイプ（raw/result はアイコン生成、line_stamp は LINE スタンプ 1 枚） */
export type BlobImageType = 'raw' | 'result' | 'line_stamp';

/** 画像アップロード用のパラメータインターフェース */
export interface UploadImageToBlobParams {
  /** アップロードする画像データ（バイナリ） */
  imageData: Buffer;
  /** 匿名セッションID */
  anonSessionId: string;
  /** ジョブID または一意のID（line_stamp の場合は識別子） */
  jobId: string;
  /** 画像タイプ */
  type: BlobImageType;
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

  // ファイル名の生成（パス構造: uploads|results|line_stamps/{anon_session_id}/{filename}）
  const extension = type === 'raw' ? 'jpg' : 'png';
  const pathPrefix = type === 'raw' ? 'uploads' : type === 'line_stamp' ? 'line_stamps' : 'results';
  const filename
    = type === 'raw'
      ? `${jobId}_raw.${extension}`
      : type === 'line_stamp'
        ? `${jobId}_stamp.${extension}`
        : `${jobId}_icon.${extension}`;
  const path = `${pathPrefix}/${anonSessionId}/${filename}`;

  // Vercel Blobにアップロード（line_stamp も PNG）
  const contentType = type === 'raw' ? 'image/jpeg' : 'image/png';
  const blob = await put(path, imageData, {
    access: 'public',
    token: config.blobReadWriteToken,
    contentType
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
