<!--
  生成進捗表示コンポーネント
  AIの処理進捗を示すシミュレーションゲージ（0〜100%）と、
  ランダムに切り替わるステータスメッセージを表示する
  使用例: <GeneratingProgress :progress="progress" :status-message="message" />
-->
<script setup lang="ts">
/** 進捗値（0-100）。親でシミュレーションして渡す */
defineProps<{
  progress: number;
  statusMessage: string;
}>();
</script>

<template>
  <div class="generating-progress space-y-3">
    <!-- AIの処理進捗を示すアニメーションゲージ -->
    <UProgress
      :model-value="progress"
      :max="100"
      size="lg"
      color="primary"
      :status="true"
      aria-label="生成進捗"
    />
    <!-- ランダムなステータスメッセージ -->
    <p
      class="text-center text-muted text-sm min-h-6"
      aria-live="polite"
    >
      {{ statusMessage }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.generating-progress {
  width: 100%;
}
</style>
