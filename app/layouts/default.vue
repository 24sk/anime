<script setup lang="ts">
/**
 * デフォルトレイアウト
 * ヘッダー（ロゴ・UNavigationMenu・使い方・カラーモード）とメインコンテンツを提供する
 * スマホ時はハンバーガーメニューで #body を開き、4項目（利用規約・お問い合わせ・AniMeについて・FAQ）を表示
 */
import type { NavigationMenuItem } from '@nuxt/ui';

const route = useRoute();

// モバイルメニュー開閉状態（#body を閉じるために使用）
const headerOpen = ref(false);

/**
 * ナビゲーション用のリンク項目（4項目：規約・お問い合わせ・About・FAQ）
 * PC の UNavigationMenu と スマホの #body 内で共通利用
 */
const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '利用規約・プライバシー',
    icon: 'i-lucide-file-text',
    to: '/terms',
    active: route.path.startsWith('/terms')
  },
  {
    label: 'お問い合わせ',
    icon: 'i-lucide-mail',
    to: '/contact',
    active: route.path.startsWith('/contact')
  },
  {
    label: 'AniMeについて',
    icon: 'i-lucide-info',
    to: '/about',
    active: route.path.startsWith('/about')
  },
  {
    label: 'FAQ',
    icon: 'i-lucide-message-circle-question',
    to: '/faq',
    active: route.path.startsWith('/faq')
  }
]);
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-[#E0F2F1] to-primary-100 dark:from-gray-950 dark:to-gray-900">
    <UHeader
      v-model:open="headerOpen"
      :toggle="{
        color: 'neutral',
        variant: 'ghost',
        class: 'rounded-full'
      }"
    >
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center"
        >
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <!-- PC: 4リンクをナビゲーション表示 -->
      <UNavigationMenu
        :items="navItems"
        class="hidden md:flex flex-1 justify-end"
      />

      <template #right>
        <UColorModeButton />
      </template>

      <!-- スマホ: ハンバーガーで開くメニュー（4リンク） -->
      <template #body>
        <div class="flex flex-col gap-1 -mx-2.5">
          <UNavigationMenu
            :items="navItems"
            orientation="vertical"
          />
        </div>
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
