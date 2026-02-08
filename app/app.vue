<script setup lang="ts">
// SEOメタは nuxt.config.ts の app.head で一元管理。ページ単位の上書きは各ページで useSeoMeta を使用
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
