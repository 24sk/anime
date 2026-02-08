/**
 * LINEスタンプ作成ページ用の状態を管理するストア
 * - 選択中の文言（wordIds）
 * - ZIP生成中フラグ（後続タスクで使用）
 * @remark 仕様: docs/features/ui/line-stamp.md 5.3 ストア
 */

export const useLineStampStore = defineStore('line-stamp', {
  state: () => ({
    /** 選択中の単語ID一覧（重複なし・順序は選択順を保持） */
    selectedWordIds: [] as string[],
    /** ZIP生成中かどうか（後続タスクで使用） */
    isGeneratingZip: false
  }),

  getters: {
    /** 選択中の単語IDの Set（含まれるか判定用） */
    selectedWordIdSet(state): Set<string> {
      return new Set(state.selectedWordIds);
    },

    /** 選択中の単語が1つ以上あるか */
    hasSelection(state): boolean {
      return state.selectedWordIds.length > 0;
    }
  },

  actions: {
    /**
     * 単語IDをトグルする（選択されていれば解除、されていなければ追加）
     * @param wordId - 単語ID（例: ohayo, arigato）
     */
    toggleWord(wordId: string) {
      const set = new Set(this.selectedWordIds);
      if (set.has(wordId)) {
        set.delete(wordId);
      } else {
        set.add(wordId);
      }
      this.selectedWordIds = Array.from(set);
    },

    /**
     * セットに含まれる単語を一括でトグルする
     * セット内がすべて選択済みの場合は解除、そうでなければ追加
     * @param wordIds - セットに含まれる単語IDの配列
     */
    toggleSet(wordIds: readonly string[]) {
      const current = new Set(this.selectedWordIds);
      const allSelected = wordIds.every(id => current.has(id));
      if (allSelected) {
        wordIds.forEach(id => current.delete(id));
      } else {
        wordIds.forEach(id => current.add(id));
      }
      this.selectedWordIds = Array.from(current);
    },

    /**
     * 選択中の単語IDを設定する（上書き）
     * @param wordIds - 設定する単語IDの配列
     */
    setSelectedWordIds(wordIds: string[]) {
      this.selectedWordIds = [...wordIds];
    },

    /** 選択をすべて解除する */
    clearSelection() {
      this.selectedWordIds = [];
    },

    /** ZIP生成中フラグを設定（後続タスクで使用） */
    setIsGeneratingZip(value: boolean) {
      this.isGeneratingZip = value;
    },

    /** ストアをリセット（ページ離脱時など） */
    reset() {
      this.selectedWordIds = [];
      this.isGeneratingZip = false;
    }
  }
});
