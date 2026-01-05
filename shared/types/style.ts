/**
 * スタイルタイプの定義
 * @remark APIのstyle_typeと一致させること
 */
export const styleTypes = [
  '3d-anime',
  'watercolor',
  'fluffy',
  'cyberpunk',
  'korean-style',
  'simple-illustration'
] as const

/**
 * スタイルタイプの型
 */
export type StyleType = typeof styleTypes[number]
