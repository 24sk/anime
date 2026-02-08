<script setup lang="ts">
/**
 * FAQ（よくある質問）ページ
 * 利用方法・対応形式・生成時間・スタイルなどに関するQ&Aを掲載
 */

useSeoMeta({
  title: 'よくある質問（FAQ） | AniMe',
  description:
    'AniMe（アニミー）のよくある質問です。対応画像形式、生成時間、スタイルの違いなどをまとめています。'
})
useHead({
  title: 'よくある質問（FAQ） | AniMe'
})

/** FAQの1項目 */
interface FaqItem {
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    question: '対応している画像形式は？',
    answer:
      'JPG（JPEG）またはPNG形式の画像をご利用ください。ファイルサイズは4.5MBまでです。なるべく顔や体がはっきり写っている写真を使うと、より良い結果が出やすくなります。'
  },
  {
    question: '生成にはどのくらい時間がかかりますか？',
    answer:
      '目安として10〜15秒程度です。サーバーの混雑状況により変動することがあります。生成中は画面で進捗をご確認いただけます。'
  },
  {
    question: 'スタイルの違いは？',
    answer:
      '3Dアニメはピクサー風の立体感のあるイラスト、水彩画は淡い色合いの絵の具風、ゆるふわ手書きは柔らかい線の手描き風、サイバーパンクはネオンや未来的な雰囲気、韓国風はK-POPやK-ドラマのイラスト風、シンプルイラストはクリーンな線画風です。お好みのスタイルをお選びください。'
  },
  {
    question: '生成に失敗することがあるのはなぜ？',
    answer:
      '写真の内容がAIの安全ポリシーに触れる場合、またはサーバーが混雑している場合に失敗することがあります。「別の写真でお試しください」「しばらく時間を置いて再度お試しください」などのメッセージが表示された場合は、案内に従って再度お試しください。'
  },
  {
    question: '生成したアイコンの著作権は？',
    answer:
      '生成されたアイコンは、ご利用いただいた方の個人利用（SNSアイコン、デバイスの壁紙など）にご利用いただけます。商用利用や再配布については、利用規約をご確認ください。'
  }
]

/**
 * 回答文を句点（。）で分割し、空でない行の配列を返す
 * 表示時に句点で改行するために使用
 */
function toLines(text: string): string[] {
  return text.split('。').filter(s => s.trim().length > 0)
}

/** 表示用：各回答を句点で分割した行配列を持つ */
const faqItemsWithLines = computed(() =>
  faqItems.map(item => ({ ...item, lines: toLines(item.answer) }))
)
</script>

<template>
  <div class="py-8 md:py-12">
    <h1 class="text-xl md:text-2xl font-semibold text-brand-700 mb-8">
      よくある質問（FAQ）
    </h1>

    <ul class="space-y-6">
      <li
        v-for="(item, index) in faqItemsWithLines"
        :key="index"
        class="border-b border-default pb-6 last:border-b-0"
      >
        <h2 class="text-base font-semibold text-brand-700 mb-2">
          {{ item.question }}
        </h2>
        <p class="text-sm text-default leading-relaxed">
          <template
            v-for="(line, lineIdx) in item.lines"
            :key="lineIdx"
          >
            {{ line }}。<br v-if="lineIdx < item.lines.length - 1">
          </template>
        </p>
      </li>
    </ul>

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
