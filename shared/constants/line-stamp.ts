/**
 * LINEスタンプ用プリセット定数
 * 単語・セット・カテゴリは仕様 3.2.1 / 3.2.2 / 3.2.3 に基づく
 * @remark 仕様: docs/requirements/line-stamp-spec.md
 */

import type {
  StampCategory,
  StampSet,
  StampWord,
  StampWordGroup
} from '../types/line-stamp';

/**
 * 単語プリセット（初期実装分）
 * あいさつ・感謝・リアクション・応援・愛情・ごめん・フォロー
 * 仕事用・季節は Phase 2 で追加予定
 */
export const STAMP_WORDS: readonly StampWord[] = [
  // あいさつ
  { id: 'ohayo', label: 'おはよう', group: 'aisatsu' },
  { id: 'oyasumi', label: 'おやすみ', group: 'aisatsu' },
  { id: 'konnichiwa', label: 'こんにちは', group: 'aisatsu' },
  { id: 'bye', label: 'バイバイ', group: 'aisatsu' },
  { id: 'tadaima', label: 'ただいま', group: 'aisatsu' },
  { id: 'okaeri', label: 'おかえり', group: 'aisatsu' },
  // 感謝・ねぎらい
  { id: 'arigato', label: 'ありがとう', group: 'kansha' },
  { id: 'thanks', label: 'Thanks', group: 'kansha' },
  { id: 'otsukare', label: 'おつかれさま', group: 'kansha' },
  { id: 'tasukatta', label: '助かった', group: 'kansha' },
  // リアクション
  { id: 'iine', label: 'いいね！', group: 'reaction' },
  { id: 'wakatta', label: 'わかった', group: 'reaction' },
  { id: 'ryokai', label: '了解', group: 'reaction' },
  { id: 'ok', label: 'OK', group: 'reaction' },
  { id: 'yatta', label: 'やったー', group: 'reaction' },
  { id: 'ee', label: 'えー！', group: 'reaction' },
  // 応援・励まし
  { id: 'ganbare', label: 'がんばれ', group: 'oen' },
  { id: 'fight', label: 'ファイト', group: 'oen' },
  { id: 'daijobu', label: '大丈夫', group: 'oen' },
  { id: 'murishinaide', label: '無理しないで', group: 'oen' },
  // 愛情
  { id: 'daisuki', label: 'だいすき', group: 'ai_follow' },
  { id: 'kawaii', label: 'かわいい', group: 'ai_follow' },
  { id: 'iiko', label: 'いい子', group: 'ai_follow' },
  { id: 'chu', label: 'チュー', group: 'ai_follow' },
  // ごめん・フォロー
  { id: 'gomen', label: 'ごめんね', group: 'gomen_follow' },
  { id: 'okurete_gomen', label: '遅れてごめん', group: 'gomen_follow' },
  { id: 'otto', label: 'おっと', group: 'gomen_follow' },
  { id: 'doki', label: 'ドキッ', group: 'gomen_follow' }
] as const;

/**
 * セットプリセット
 * 必須セット（あいさつ・感謝・リアクション・愛情・フォロー・応援）と
 * おすすめ8個（申請用最小構成）を定義
 */
export const STAMP_SETS: readonly StampSet[] = [
  {
    id: 'aisatsu',
    name: 'あいさつ',
    wordIds: ['ohayo', 'oyasumi', 'konnichiwa', 'bye', 'tadaima', 'okaeri'],
    type: 'required'
  },
  {
    id: 'kansha',
    name: '感謝',
    wordIds: ['arigato', 'thanks', 'otsukare', 'tasukatta'],
    type: 'required'
  },
  {
    id: 'reaction',
    name: 'リアクション',
    wordIds: ['iine', 'wakatta', 'ryokai', 'ok', 'yatta', 'ee'],
    type: 'required'
  },
  {
    id: 'ai_follow',
    name: '愛情・フォロー',
    wordIds: [
      'daisuki',
      'kawaii',
      'iiko',
      'chu',
      'gomen',
      'okurete_gomen',
      'otto',
      'doki'
    ],
    type: 'required'
  },
  {
    id: 'oen',
    name: '応援',
    wordIds: ['ganbare', 'fight', 'daijobu', 'murishinaide'],
    type: 'required'
  },
  // おすすめ8個（申請用）：LINE申請の最小8個を1クリックで選択可能にする
  {
    id: 'recommended_8',
    name: 'おすすめ8個（申請用）',
    wordIds: [
      'ohayo',
      'oyasumi',
      'arigato',
      'otsukare',
      'iine',
      'daisuki',
      'gomen',
      'bye'
    ],
    type: 'recommended_8'
  }
] as const;

/**
 * カテゴリプリセット
 * セットのグループ表示・タブ切り替えに利用
 * extended（仕事用・季節）は Phase 2 で追加予定
 */
export const STAMP_CATEGORIES: readonly StampCategory[] = [
  {
    id: 'daily',
    name: '毎日使える',
    setIds: ['aisatsu', 'kansha', 'reaction', 'ai_follow', 'oen']
  },
  {
    id: 'recommended',
    name: 'はじめての申請',
    setIds: ['recommended_8']
  }
] as const;

/**
 * おすすめ8個セットのID（UIで目立つ位置に配置する際の参照用）
 */
export const RECOMMENDED_8_SET_ID = 'recommended_8' as const;

/**
 * 単語グループの表示名（UIの見出し用）
 * 仕様 3.2.1 の分類名に対応
 */
export const STAMP_GROUP_LABELS: Record<StampWordGroup, string> = {
  aisatsu: 'あいさつ',
  kansha: '感謝・ねぎらい',
  reaction: 'リアクション',
  oen: '応援・励まし',
  ai_follow: '愛情',
  gomen_follow: 'ごめん・フォロー',
  work: '仕事用',
  seasonal: '季節・イベント'
};
