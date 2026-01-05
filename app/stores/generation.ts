export const useGenerationStore = defineStore('generation', {
  state: () => ({
    imageFile: null as File | null,
    imagePreview: null as string | null,
    selectedStyle: null as string | null,
    freeText: '' as string,
    jobId: null as string | null,
    status: 'idle' as 'idle' | 'generating' | 'completed' | 'error'
  }),

  getters: {
    canGenerate: (state) => {
      return state.imageFile !== null && state.selectedStyle !== null
    }
  },

  actions: {
    setImageFile(file: File | null) {
      this.imageFile = file
      if (file) {
        // プレビュー画像の生成
        const reader = new FileReader()
        reader.onload = (e) => {
          this.imagePreview = e.target?.result as string
        }
        reader.readAsDataURL(file)
      } else {
        this.imagePreview = null
      }
    },

    setSelectedStyle(style: string | null) {
      this.selectedStyle = style
    },

    setFreeText(text: string) {
      this.freeText = text
    },

    setJobId(jobId: string | null) {
      this.jobId = jobId
    },

    setStatus(status: 'idle' | 'generating' | 'completed' | 'error') {
      this.status = status
    },

    reset() {
      this.imageFile = null
      this.imagePreview = null
      this.selectedStyle = null
      this.freeText = ''
      this.jobId = null
      this.status = 'idle'
    }
  }
})
