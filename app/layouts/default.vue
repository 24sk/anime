<script setup lang="ts">
/**
 * デフォルトレイアウト
 * ヘッダー（ロゴ・使い方ガイド・カラーモード）とメインコンテンツを提供する
 */
import { usageTourSteps } from '~/composables/useUsageTour'

const route = useRoute()
const toast = useToast()

// 使い方ガイド（Driver.js）。DOM 参照のため onMounted（クライアント）で初期化
const driverInstance = ref<ReturnType<typeof useDriver> | null>(null)
onMounted(() => {
  driverInstance.value = useDriver({
    showProgress: true,
    animate: true,
    steps: usageTourSteps
  })
})

/**
 * 使い方ガイドツアーを開始する
 * トップ画面（/）以外ではトーストで案内し、トップ画面では Driver.js のツアーを開始する
 */
function startUsageTour() {
  if (route.path !== '/') {
    toast.add({
      title: '使い方ガイド',
      description: 'トップページでご利用ください。',
      color: 'neutral'
    })
    return
  }
  driverInstance.value?.drive()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-[#E0F2F1] to-primary-100">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center"
        >
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <template #right>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-help-circle"
          aria-label="使い方"
          label="使い方"
          @click="startUsageTour"
        />

        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
