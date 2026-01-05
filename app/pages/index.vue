<script setup lang="ts">
const generationStore = useGenerationStore()
const router = useRouter()
const toast = useToast()

const isGenerating = ref(false)

const canGenerate = computed(() => {
  return generationStore.imageFile !== null && generationStore.selectedStyle !== null
})

const handleGenerate = async () => {
  if (!canGenerate.value || isGenerating.value) {
    return
  }

  try {
    isGenerating.value = true
    generationStore.setStatus('generating')

    // TODO: 画像をVercel Blobにアップロード
    // TODO: APIリクエストを送信
    // 現在はモックとして生成中画面へ遷移
    await router.push('/generating')
  } catch (error) {
    console.error('生成エラー:', error)
    toast.add({
      title: 'エラーが発生しました',
      description: '画像の生成に失敗しました。もう一度お試しください。',
      color: 'error'
    })
    generationStore.setStatus('error')
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="space-y-8 py-8">
    <div class="text-center">
      <h2 class="mt-2 text-muted">
        「うちの子」を世界に一つだけのデジタルアートへ
      </h2>
    </div>

    <div class="mx-auto max-w-2xl space-y-6">
      <!-- 画像アップロードエリア -->
      <ImageUploadArea />

      <!-- スタイルセレクター -->
      <StyleSelector />

      <!-- フリーテキスト入力 -->
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">
          自由にアレンジしてみよう
        </h2>
        <UTextarea
          v-model="generationStore.freeText"
          placeholder="例：リボンをつけて、笑顔で、背景をシンプルに"
          :rows="3"
          class="w-full"
        />
      </div>

      <!-- 生成ボタン -->
      <UButton
        :disabled="!canGenerate"
        :loading="isGenerating"
        block
        size="xl"
        class="rounded-3xl"
        @click="handleGenerate"
      >
        <template v-if="!isGenerating">
          アイコンを作成する
        </template>
        <template v-else>
          アイコン作成中...
        </template>
      </UButton>
    </div>
  </div>
</template>
