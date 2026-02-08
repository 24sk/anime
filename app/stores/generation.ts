/**
 * 画像生成関連の状態を管理するストア
 * - 画像ファイルとプレビュー
 * - 選択されたスタイル・フリーテキスト
 * - ジョブID・ステータス・結果画像URL
 */
export const useGenerationStore = defineStore('generation', {
  state: () => ({
    imageFile: null as File | null,
    imagePreview: null as string | null,
    selectedStyle: null as string | null,
    freeText: '' as string,
    jobId: null as string | null,
    status: 'idle' as 'idle' | 'generating' | 'completed' | 'error',
    /** 生成失敗時にバックエンドから渡されるユーザー向けメッセージ */
    errorMessage: null as string | null,
    /** 生成完了時のアイコン画像URL（Vercel Blob） */
    resultImageUrl: null as string | null
  }),

  getters: {
    canGenerate: (state) => {
      return state.imageFile !== null && state.selectedStyle !== null;
    }
  },

  actions: {
    setImageFile(file: File | null) {
      this.imageFile = file;
      if (file) {
        // プレビュー画像の生成
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        this.imagePreview = null;
      }
    },

    setSelectedStyle(style: string | null) {
      this.selectedStyle = style;
    },

    setFreeText(text: string) {
      this.freeText = text;
    },

    setJobId(jobId: string | null) {
      this.jobId = jobId;
    },

    setStatus(status: 'idle' | 'generating' | 'completed' | 'error') {
      this.status = status;
    },

    /** 生成失敗時のユーザー向けメッセージを保存（Realtime通知で設定） */
    setErrorMessage(message: string | null) {
      this.errorMessage = message;
    },

    /** 生成完了時の結果画像URLを保存（Realtime通知で設定） */
    setResultImageUrl(url: string | null) {
      this.resultImageUrl = url;
    },

    reset() {
      this.imageFile = null;
      this.imagePreview = null;
      this.selectedStyle = null;
      this.freeText = '';
      this.jobId = null;
      this.status = 'idle';
      this.errorMessage = null;
      this.resultImageUrl = null;
    }
  }
});
