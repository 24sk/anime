/**
 * LINEスタンプ作成ページ用の状態を管理するストア
 * - 選択中の文言はプリセット1件または自由入力1件のいずれか（単一選択）
 * - ZIP生成中フラグ（後続タスクで使用）
 * @remark 仕様: docs/features/ui/line-stamp.md 5.3 ストア
 */

import { STAMP_WORDS } from '~~/shared/constants/line-stamp';

export const useLineStampStore = defineStore('line-stamp', {
  state: () => ({
    /** 選択中のプリセット単語ID（null の場合は自由入力を使用） */
    selectedWordId: null as string | null,
    /** 自由入力の文言（プリセット未選択時に使用。API・プレビューではこちらを優先） */
    customWord: '',
    /** AI でスタンプ 1 枚生成中かどうか */
    isGeneratingStamp: false,
    /** 生成完了後のスタンプ画像 URL（1 枚）。未生成・エラー時は null */
    generatedStampImageUrl: null as string | null,
    /** 生成失敗時のユーザー向けエラーメッセージ。未発生時は null */
    generateError: null as string | null,
    /** ZIP生成中かどうか（後続タスクで使用） */
    isGeneratingZip: false
  }),

  getters: {
    /** 選択中のプリセット単語IDの Set（含まれるか判定用・単一選択のため0または1） */
    selectedWordIdSet(state): Set<string> {
      return state.selectedWordId ? new Set([state.selectedWordId]) : new Set();
    },

    /**
     * 実際に使用する文言（API・プレビュー用）
     * 自由入力が空でなければその値、否则は選択中プリセットの label
     */
    effectiveLabel(state): string {
      const trimmed = state.customWord.trim();
      if (trimmed) return trimmed;
      if (!state.selectedWordId) return '';
      const word = STAMP_WORDS.find(w => w.id === state.selectedWordId);
      return word?.label ?? '';
    },

    /** 文言が1件選択されているか（プリセットまたは自由入力） */
    hasSelection(state): boolean {
      if (state.customWord.trim()) return true;
      return state.selectedWordId !== null;
    }
  },

  actions: {
    /**
     * プリセット単語を1件選択する（自由入力をクリアする）
     * @param wordId - 単語ID（例: ohayo）。null の場合はプリセット選択を解除
     */
    setSelectedWordId(wordId: string | null) {
      this.selectedWordId = wordId;
      this.customWord = '';
    },

    /**
     * 自由入力の文言を設定する（プリセット選択を解除する）
     * @param text - ユーザーが入力した文言
     */
    setCustomWord(text: string) {
      this.customWord = text;
      this.selectedWordId = null;
    },

    /** 選択をすべて解除する */
    clearSelection() {
      this.selectedWordId = null;
      this.customWord = '';
    },

    /** ZIP生成中フラグを設定（後続タスクで使用） */
    setIsGeneratingZip(value: boolean) {
      this.isGeneratingZip = value;
    },

    /** AI スタンプ生成開始（ローディング状態にし、前回の結果・エラーをクリア） */
    startGeneratingStamp() {
      this.isGeneratingStamp = true;
      this.generatedStampImageUrl = null;
      this.generateError = null;
    },

    /** AI スタンプ生成成功（結果 URL を保存） */
    setGeneratedStampImageUrl(url: string) {
      this.isGeneratingStamp = false;
      this.generatedStampImageUrl = url;
      this.generateError = null;
    },

    /** AI スタンプ生成失敗（ユーザー向けメッセージを保存） */
    setGenerateError(message: string) {
      this.isGeneratingStamp = false;
      this.generatedStampImageUrl = null;
      this.generateError = message;
    },

    /** ストアをリセット（ページ離脱時など） */
    reset() {
      this.selectedWordId = null;
      this.customWord = '';
      this.isGeneratingStamp = false;
      this.generatedStampImageUrl = null;
      this.generateError = null;
      this.isGeneratingZip = false;
    }
  }
});
