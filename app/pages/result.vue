<!--
  画面3：結果・プレビュー画面（暫定）
  生成中画面から遷移する先。完成したアイコン表示・ダウンロード等の本実装は画面3タスクで行う。
-->
<script setup lang="ts">
const generationStore = useGenerationStore()
const router = useRouter()

/** トップへ戻る（もう一度作る） */
function goHome() {
  generationStore.reset()
  router.push('/')
}

onMounted(() => {
  if (!generationStore.jobId || generationStore.status !== 'completed') {
    router.replace('/')
  }
})
</script>

<template>
  <div class="py-8 text-center">
    <h1 class="text-xl font-semibold">
      生成が完了しました
    </h1>
    <div class="mt-6">
      <img
        v-if="generationStore.resultImageUrl"
        :src="generationStore.resultImageUrl"
        alt="生成されたペットアイコン"
        width="256"
        height="256"
        class="mx-auto rounded-2xl object-cover"
      >
      <p
        v-else
        class="text-muted"
      >
        画像を読み込んでいます...
      </p>
    </div>
    <UButton
      class="mt-8"
      @click="goHome"
    >
      もう一度作る
    </UButton>
  </div>
</template>
