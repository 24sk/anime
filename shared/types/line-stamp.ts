/**
 * LINEスタンプ用の型定義
 * @remark 仕様: docs/requirements/line-stamp-spec.md 3.2 文言プリセット
 */

/**
 * 単語の分類（UIのグループ表示・セット定義に利用）
 * work / seasonal は Phase 2 で追加予定
 */
export type StampWordGroup
  = | 'aisatsu'
    | 'kansha'
    | 'reaction'
    | 'oen'
    | 'ai_follow'
    | 'gomen_follow'
    | 'work'
    | 'seasonal';

/**
 * 単語プリセット1件
 * id は仕様 3.2.1 の単語ID、label は表示テキスト
 */
export interface StampWord {
  /** 単語ID（例: ohayo, arigato） */
  id: string;
  /** 表示用テキスト（例: おはよう、ありがとう） */
  label: string;
  /** あいさつ / 感謝 / リアクション などのグループ */
  group: StampWordGroup;
}

/**
 * セット種別
 * recommended_8 は UI で目立たせる等に利用
 */
export type StampSetType = 'required' | 'recommended_8' | 'extended';

/**
 * セット（複数単語をまとめたグループ）
 * セット選択で含まれる全単語を一括選択できる
 */
export interface StampSet {
  /** セットID（例: aisatsu, recommended_8） */
  id: string;
  /** 表示名（例: あいさつ、おすすめ8個（申請用）） */
  name: string;
  /** 含まれる単語のID一覧 */
  wordIds: readonly string[];
  /** 必須セット / 推奨8個 / 拡張（Phase 2） */
  type?: StampSetType;
}

/**
 * カテゴリ（セットのグループ表示用）
 * UI で「カテゴリ → セット → 単語」とたどる際に利用
 */
export interface StampCategory {
  /** カテゴリID（例: daily, recommended） */
  id: string;
  /** 表示名（例: 毎日使える、はじめての申請） */
  name: string;
  /** 含まれるセットのID一覧 */
  setIds: readonly string[];
}
