import { v4 as uuidv4 } from 'uuid';

/**
 * 匿名セッションIDを管理するcomposable
 * ローカルストレージに保存し、永続化する
 */
export const useAnonSession = () => {
  const STORAGE_KEY = 'anime_anon_session_id';

  /**
   * 匿名セッションIDを取得する（存在しない場合は生成）
   * @returns {string} 匿名セッションID（UUID）
   */
  const getAnonSessionId = (): string => {
    // クライアントサイドでのみ実行
    if (import.meta.server) {
      return '';
    }

    // ローカルストレージから取得を試みる
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }

    // 存在しない場合は新規生成して保存
    const newSessionId = uuidv4();
    localStorage.setItem(STORAGE_KEY, newSessionId);
    return newSessionId;
  };

  /**
   * 匿名セッションIDをリセットする（新規生成）
   * @returns {string} 新しい匿名セッションID（UUID）
   */
  const resetAnonSessionId = (): string => {
    if (import.meta.server) {
      return '';
    }

    const newSessionId = uuidv4();
    localStorage.setItem(STORAGE_KEY, newSessionId);
    return newSessionId;
  };

  return {
    getAnonSessionId,
    resetAnonSessionId
  };
};
