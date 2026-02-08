<script setup lang="ts">
/**
 * お問い合わせページ
 * メールリンク（mailto）による問い合わせ窓口を提供。グローバルメニューから遷移する
 */

// お問い合わせ先メールアドレス（環境変数またはデフォルト）
const contactEmail = import.meta.env.NUXT_PUBLIC_CONTACT_EMAIL ?? 'support@example.com'
const mailtoLink = computed(() => `mailto:${contactEmail}`)

useSeoMeta({
  title: 'お問い合わせ',
  description: 'AniMe（アニミー）へのお問い合わせは、下記メールリンクからお願いいたします。'
})
</script>

<template>
  <div class="py-8 md:py-12">
    <h1 class="text-xl md:text-2xl font-semibold text-brand-700 mb-6">
      お問い合わせ
    </h1>

    <p class="text-default mb-6 leading-relaxed">
      ご質問・ご要望・不具合の報告は、下記メールアドレスまでお送りください。
    </p>

    <p class="mb-8 leading-relaxed">
      <a
        :href="mailtoLink"
        class="text-primary font-medium hover:underline inline-flex items-center gap-2"
        rel="noopener noreferrer"
      >
        <UIcon name="i-lucide-mail" class="size-5" />
        {{ contactEmail }}
      </a>
    </p>

    <p class="text-sm text-muted leading-relaxed">
      お手数ですが、件名に「AniMeについて」などとご記入いただくとスムーズです。通常、2〜3営業日以内にご返信いたします。
    </p>

    <p class="mt-10 text-sm text-muted">
      <NuxtLink
        to="/"
        class="text-primary hover:underline"
      >
        トップページへ戻る
      </NuxtLink>
    </p>
  </div>
</template>
