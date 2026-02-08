<script setup lang="ts">
/**
 * AniMeについて（サービス説明）ページ
 * サービス名・コンセプト・概要を記載。グローバルメニューから遷移する
 */

// ページ固有のタイトル・説明（nuxt.config の titleTemplate により「AniMeについて」→「AniMeについて | AniMe」になる）
useSeoMeta({
  title: 'AniMeについて',
  description:
    'AniMe（アニミー）は、ペットの写真をAIでアイコン化するサービスです。「うちの子」を世界に一つだけのデジタルアートに。'
})
</script>

<template>
  <div class="py-8 md:py-12">
    <h1 class="text-xl md:text-2xl font-semibold text-brand-700 mb-8">
      AniMeについて
    </h1>

    <section class="space-y-6 text-default leading-relaxed">
      <p class="text-lg font-medium text-primary-600">
        「うちの子」を世界に一つだけのデジタルアートへ
      </p>

      <p>
        AniMe（アニミー）は、大切なペットの写真を、AIを使っておしゃれなイラスト風アイコンに変換するWebサービスです。
      </p>

      <p>
        写真の構図・毛色・表情を活かしたまま、3Dアニメ風・水彩画風・ゆるふわ手書き風など、お好みのスタイルでアイコンを生成できます。SNSのプロフィール画像や、思い出の一枚としてご利用ください。
      </p>

      <h2 class="text-lg font-semibold text-brand-700 mt-8">
        主な特徴
      </h2>
      <ul class="list-disc list-inside space-y-2 text-sm leading-relaxed">
        <li>ペット写真をアップロードするだけで、数ステップでアイコンを生成</li>
        <li>6種類のスタイルから選択可能（3Dアニメ、水彩画、ゆるふわ手書き、サイバーパンク、韓国風、シンプルイラスト）</li>
        <li>「リボンをつけて」「笑顔で」など、追加の要望をテキストで指定可能</li>
        <li>生成したアイコンはダウンロードやSNSシェアが可能</li>
      </ul>
    </section>

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
