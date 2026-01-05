/** スタイルタイプの定義 */
export const styleTypes = ['3d-anime', 'watercolor', 'fluffy', 'cyberpunk', 'korean-style', 'simple-illustration'] as const

/** スタイルタイプの型 */
export type StyleType = typeof styleTypes[number]

/**
 * スタイル選択肢の型定義
 * APIのstyle_typeと一致させること
 */
export interface StyleOption {
  /**
   * スタイルタイプ
   * @remark APIのstyle_typeと一致させること
   */
  value: StyleType
  /** 表示ラベル */
  label: string
  /**
   * アイコン名
   * @remark Iconify形式
   */
  icon?: string
  /** スタイルの説明 */
  description: string
}

/**
 * スタイル選択肢の配列型
 */
export type StyleOptions = readonly StyleOption[]
