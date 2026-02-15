<script setup lang="ts">
/**
 * AniMe ランディングページ
 * サービスの顔となるページ。静的生成（prerender）され、高速に表示される。
 * アプリ機能（/generate）への誘導を主目的とする。
 */

useSeoMeta({
  title: 'AniMe - AIペットアイコンジェネレーター',
  description: '「うちの子」を世界に一つだけのデジタルアートへ。ペットの写真をAIで可愛いアイコンに変換します。3Dアニメ風、水彩画風などスタイルも自由自在。',
  ogTitle: 'AniMe - AIペットアイコンジェネレーター',
  ogDescription: '「うちの子」を世界に一つだけのデジタルアートへ。ペットの写真をAIで可愛いアイコンに変換します。',
  ogImage: 'https://placehold.jp/1200x630.png' // 後でちゃんとしたOGP画像を設定推奨
});

const features = [
  {
    title: 'カンタン3ステップ',
    description: '写真をアップロードして、スタイルを選ぶだけ。面倒な設定は一切ありません。',
    icon: 'i-heroicons-cursor-arrow-rays'
  },
  {
    title: '多彩なスタイル',
    description: '3Dアニメ、水彩画、手書き風など、6種類以上のスタイルから選べます。',
    icon: 'i-heroicons-swatch'
  },
  {
    title: 'あなただけの1枚',
    description: '「リボンをつけて」「背景を青く」など、言葉でアレンジを加えることも可能です。',
    icon: 'i-heroicons-sparkles'
  }
];

const styles = [
  { name: '3Dアニメ', color: 'bg-orange-100 text-orange-600' },
  { name: '水彩画', color: 'bg-blue-100 text-blue-600' },
  { name: '手書き風', color: 'bg-pink-100 text-pink-600' },
  { name: 'サイバーパンク', color: 'bg-purple-100 text-purple-600' },
  { name: '韓国風', color: 'bg-teal-100 text-teal-600' },
  { name: 'シンプルイラスト', color: 'bg-slate-100 text-slate-600' }
];
</script>

<template>
  <div class="overflow-hidden">
    <!-- Hero Section -->
    <section class="relative bg-[#FFF5F5] dark:bg-gray-900 py-20 lg:py-32">
      <!-- Decorator Circles -->
      <div class="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary-100 blur-3xl opacity-60" />
      <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-orange-100 blur-3xl opacity-60" />

      <UContainer class="relative z-10">
        <div class="text-center max-w-3xl mx-auto">
          <UBadge
            variant="subtle"
            size="lg"
            class="mb-6 rounded-full px-4 py-1.5 font-medium"
          >
            AIでうちの子をもっと可愛く
          </UBadge>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 !leading-tight">
            「うちの子」を<br class="sm:hidden">世界に一つ<br class="hidden sm:inline">だけの<br><span class="text-primary-500">デジタルアート</span>へ
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
            いつものペットの写真を、AIが数秒でおしゃれなアイコンに変換。<br class="hidden sm:inline">
            専門的な知識は不要。誰でも簡単に、素敵な1枚を作れます。
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <UButton
              to="/generate"
              size="xl"
              class="rounded-full px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              icon="i-heroicons-sparkles"
            >
              今すぐ作る（無料）
            </UButton>
            <UButton
              to="#features"
              variant="ghost"
              size="xl"
              class="rounded-full px-8"
              color="neutral"
            >
              詳しく見る
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Styles Scroll -->
    <div class="bg-white dark:bg-gray-950 py-8 border-y border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="flex flex-wrap gap-4 justify-center px-4 w-full mx-auto">
        <span
          v-for="style in styles"
          :key="style.name"
          :class="[style.color, 'px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap']"
        >
          # {{ style.name }}
        </span>
      </div>
    </div>

    <!-- Features Section -->
    <section
      id="features"
      class="py-20 bg-white dark:bg-gray-950"
    >
      <UContainer>
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold mb-4">
            AniMeでできること
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            最新のAI技術を使って、あなたのペット写真を魅力的に変身させます
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <UCard
            v-for="(feature, idx) in features"
            :key="idx"
            class="border-none shadow-lg ring-1 ring-gray-100 dark:ring-gray-800 bg-[#FAFAFA] dark:bg-gray-900 transition-transform hover:-translate-y-1"
          >
            <div class="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
              <UIcon
                :name="feature.icon"
                class="w-6 h-6"
              />
            </div>
            <h3 class="text-xl font-bold mb-3">
              {{ feature.title }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ feature.description }}
            </p>
          </UCard>
        </div>
      </UContainer>
    </section>

    <!-- LINE Stamp Section -->
    <section class="py-20 bg-[#F0FFF4] dark:bg-gray-900 overflow-hidden relative">
      <div class="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-green-100 blur-3xl opacity-50 pointer-events-none" />
      <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-green-50 blur-3xl opacity-50 pointer-events-none" />

      <UContainer class="relative z-10">
        <div class="flex flex-col lg:flex-row items-center gap-12">
          <div class="lg:w-1/2 order-2 lg:order-1">
            <!-- Placeholder for Stamp Mockup -->
            <div class="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl transform -rotate-2 border-4 border-green-100 dark:border-green-900 max-w-md mx-auto">
              <div class="grid grid-cols-2 gap-4">
                <NuxtImg
                  src="/images/angry.png"
                  class="aspect-square w-full h-full object-contain rounded-xl bg-white dark:bg-gray-700 p-2 shadow-sm"
                  alt="Angry stamp"
                />
                <NuxtImg
                  src="/images/good-morning.png"
                  class="aspect-square w-full h-full object-contain rounded-xl bg-white dark:bg-gray-700 p-2 shadow-sm"
                  alt="Good morning stamp"
                />
                <NuxtImg
                  src="/images/good-night.png"
                  class="aspect-square w-full h-full object-contain rounded-xl bg-white dark:bg-gray-700 p-2 shadow-sm"
                  alt="Good night stamp"
                />
                <NuxtImg
                  src="/images/sorry.png"
                  class="aspect-square w-full h-full object-contain rounded-xl bg-white dark:bg-gray-700 p-2 shadow-sm"
                  alt="Sorry stamp"
                />
              </div>
              <div class="mt-4 text-center font-bold text-gray-400">
                LINEスタンプ イメージ
              </div>
            </div>
          </div>
          <div class="lg:w-1/2 order-1 lg:order-2">
            <UBadge
              variant="subtle"
              color="success"
              class="mb-4 rounded-full px-3 py-1"
            >
              New Feature
            </UBadge>
            <h2 class="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              LINEスタンプも<br><span class="text-green-500">カンタン作成</span>
            </h2>
            <p class="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              背景透過（PNG）画像も生成できるので、LINEスタンプの作成にも最適です。<br>
              愛犬・愛猫の表情豊かなスタンプを作って、<br class="hidden lg:inline">家族や友だちとのトークをもっと楽しく盛り上げましょう！
            </p>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-6 h-6 text-green-500 flex-shrink-0"
                />
                <span class="text-gray-700 dark:text-gray-200">背景透過済みだからそのまま使える</span>
              </li>
              <li class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-6 h-6 text-green-500 flex-shrink-0"
                />
                <span class="text-gray-700 dark:text-gray-200">文字入れ機能でセリフも自由自在</span>
              </li>
              <li class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-6 h-6 text-green-500 flex-shrink-0"
                />
                <span class="text-gray-700 dark:text-gray-200">8個や16個のセット作成もスムーズ</span>
              </li>
            </ul>
            <UButton
              to="/generate"
              size="lg"
              color="success"
              variant="solid"
              class="rounded-full px-8 font-bold shadow-lg hover:shadow-green-200/50 transition-all hover:-translate-y-1"
              icon="i-heroicons-face-smile"
              trailing
            >
              スタンプを作ってみる
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- How it works -->
    <section class="py-20 bg-[#F8FAFC] dark:bg-gray-900">
      <UContainer>
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl font-bold mb-6">
              使い方はとてもシンプル
            </h2>
            <div class="space-y-8">
              <div class="flex gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div>
                  <h3 class="text-xl font-bold mb-2">
                    写真をアップロード
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400">
                    スマホやPCに入っているペットの写真を選びます。
                  </p>
                </div>
              </div>
              <div class="flex gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div>
                  <h3 class="text-xl font-bold mb-2">
                    スタイルを選択
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400">
                    好みのスタイルを選んで、必要なら要望を入力します。
                  </p>
                </div>
              </div>
              <div class="flex gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <h3 class="text-xl font-bold mb-2">
                    完成！
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400">
                    数秒待つだけで、可愛いアイコンの出来上がり。保存してSNSでシェアしましょう。
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-10">
              <UButton
                to="/generate"
                size="xl"
                class="rounded-full px-8"
                color="primary"
                icon="i-heroicons-arrow-right"
                trailing
              >
                変換を始める
              </UButton>
            </div>
          </div>
          <div class="relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl transform rotate-2">
            <!-- Placeholder for mockup/illustration -->
            <div class="aspect-[4/3] bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center text-gray-400">
              <p class="text-center font-medium">
                Image Generation Mockup<br><span class="text-sm">(Screen Capture here)</span>
              </p>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- CTA -->
    <section class="py-20 bg-primary-500 text-white text-center">
      <UContainer>
        <h2 class="text-3xl md:text-4xl font-bold mb-6">
          あなたのペットも、アート作品に
        </h2>
        <p class="text-lg opacity-90 mb-10 max-w-2xl mx-auto">
          AniMeを使って、いつもの写真から新しい魅力を発見しませんか？<br>
          今すぐ無料でお試しいただけます。
        </p>
        <UButton
          to="/generate"
          size="xl"
          color="neutral"
          variant="solid"
          class="rounded-full px-10 py-4 text-primary-600 font-bold hover:bg-gray-100"
        >
          アイコンを作成する
        </UButton>
      </UContainer>
    </section>
  </div>
</template>

<style scoped>
/* Keyframes for simple scroll animation if needed */
@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
/* .animate-scroll {
  animation: scroll 20s linear infinite;
} */
</style>
