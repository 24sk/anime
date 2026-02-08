import type { StyleType } from '~~/shared/types/style';

/**
 * スタイル選択肢の型定義
 * APIのstyle_typeと一致させること
 */
export interface StyleOption {
  /**
   * スタイルタイプ
   * @remark APIのstyle_typeと一致させること
   */
  value: StyleType;
  /** 表示ラベル */
  label: string;
  /**
   * アイコン名
   * @remark Iconify形式
   */
  icon?: string;
  /** スタイルの説明 */
  description: string;
}

/**
 * スタイル選択肢の配列型
 */
export type StyleOptions = readonly StyleOption[];
