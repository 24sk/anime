<!--
  生成中画面の広告エリア
  画面中央の最も目立つ位置に配置する広告枠のプレースホルダー
  使用例: <GeneratingAdArea />
-->
<script setup lang="ts">
// 広告枠はプレースホルダー。実際の広告SDK連携は別タスクで差し替え可能
</script>

<template>
  <UCard class="generating-ad-area">
    <template #header>
      <div class="text-center text-muted text-sm">
        広告
      </div>
    </template>
    <div class="flex min-h-[200px] items-center justify-center rounded-lg bg-muted/30">
      <p class="text-muted text-sm">
        広告枠（プレースホルダー）
      </p>
    </div>
  </UCard>
</template>

<style scoped lang="scss">
.generating-ad-area {
  width: 100%;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}
</style>
