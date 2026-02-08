<!--
  足跡が歩き回るような背景アニメーション
  ブランドイメージの定着を目的とした可愛いローディング演出
  使用例: <FootprintBackground />
-->
<script setup lang="ts">
// 足跡アイコンを複数配置し、CSSアニメーションで動かす
const footprints = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  // ランダムに見えるよう遅延・位置をばらす（クラスで制御）
  delay: i * 0.4,
  left: 5 + (i % 4) * 22,
  top: 10 + Math.floor(i / 4) * 35
}))
</script>

<template>
  <div
    class="footprint-background"
    aria-hidden="true"
  >
    <div
      v-for="fp in footprints"
      :key="fp.id"
      class="footprint"
      :style="{
        '--delay': `${fp.delay}s`,
        left: `${fp.left}%`,
        top: `${fp.top}%`
      }"
    >
      <UIcon
        name="i-lucide-footprints"
        class="text-muted/40 text-2xl"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.footprint-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.footprint {
  position: absolute;
  animation: footprint-walk 6s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  opacity: 0.6;
}

@keyframes footprint-walk {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
  25% {
    transform: translate(8px, -6px) scale(1.05);
    opacity: 0.7;
  }
  50% {
    transform: translate(-4px, 4px) scale(0.95);
    opacity: 0.6;
  }
  75% {
    transform: translate(6px, 2px) scale(1.02);
    opacity: 0.65;
  }
}
</style>
