<script setup lang="ts">
/**
 * LINEスタンプ作成ページ（/result/line-stamp）
 * 変換済みアイコンに文言を重ね、LINE申請用画像を生成してZIPダウンロードする入口。
 * 仕様: docs/features/ui/line-stamp.md, docs/requirements/line-stamp-spec.md
 */

const generationStore = useGenerationStore();
const router = useRouter();
const route = useRoute();
const requestUrl = useRequestURL();

/** 開発時のみ: 画面表示確認用プレビューモード（?preview=1 でリダイレクトせず表示、画像なし時はサンプル表示） */
const isPreviewMode
  = import.meta.dev
    && route.query.preview === '1';

// SEO・メタ情報（ui-ux.mdc 準拠: title, meta description, canonical）
useHead({
  title: 'LINEスタンプ用に書き出し',
  meta: [
    {
      name: 'description',
      content: '完成したペットアイコンをLINEスタンプ用の画像として書き出し、ZIPでダウンロードできます。'
    }
  ],
  link: [{ rel: 'canonical', href: `${requestUrl.origin}/result/line-stamp` }]
});

/**
 * 元画像（resultImageUrl）が未設定の場合は結果画面へリダイレクト（直接URLアクセス対策・仕様 5.2）。
 * 開発時プレビューモード（?preview=1）の場合はリダイレクトせず、画像がなければサンプルを設定して表示する。
 */
onMounted(() => {
  if (isPreviewMode) {
    if (!generationStore.resultImageUrl) {
      const customImage = route.query.image;
      const sampleUrl = typeof customImage === 'string' && customImage
        ? customImage.startsWith('/') ? customImage : `/${customImage}`
        : '/images/sample.jpg';
      generationStore.setResultImageUrl(sampleUrl);
    }
    return;
  }

  if (!generationStore.resultImageUrl) {
    router.replace('/result');
  }
});
</script>

<template>
  <div class="py-8 max-w-md mx-auto px-4">
    <!-- 開発時プレビューモードであることを示すラベル（デバッグ用） -->
    <p
      v-if="isPreviewMode"
      class="mb-2 text-center text-xs text-amber-600 dark:text-amber-400"
    >
      [プレビュー] /result/line-stamp?preview=1 または ?preview=1&image=/path で表示
    </p>
    <h1 class="text-2xl font-bold text-center mb-6 text-primary-500">
      LINEスタンプ用に書き出し
    </h1>

    <!-- 申請注記（仕様 5.6 A: ヘッダー直下に1回表示、LINE Creators Market リンク併記） -->
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
      LINEクリエイターズマーケットへの申請はご自身でお願いします。
      <a
        href="https://creator.line.me/ja/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary-500 hover:underline ml-1"
      >
        LINE Creators Market
      </a>
    </p>

    <!-- 元画像なしの場合はリダイレクトされるため、表示時は必ず resultImageUrl が存在する -->
    <!-- アイコン表示は結果画面（/result）と共通: UCard + aspect-square + 512px（docs/features/ui/line-stamp.md） -->
    <div
      v-if="generationStore.resultImageUrl"
      class="space-y-6"
    >
      <section>
        <h2 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          元のアイコン
        </h2>
        <UCard class="overflow-hidden ring-4 ring-primary-100 dark:ring-primary-900 border-0 shadow-xl">
          <div class="aspect-square w-full">
            <NuxtImg
              :src="generationStore.resultImageUrl"
              alt="生成されたペットアイコン（LINEスタンプの元画像）"
              class="w-full h-full object-cover"
              width="512"
              height="512"
            />
          </div>
        </UCard>
      </section>

      <!-- 文言選択・プレビュー・ZIPダウンロードは後続タスクで実装（仕様 5.5 実装順序 2 まで） -->
      <p class="text-sm text-gray-500 dark:text-gray-400">
        文言選択・プレビュー・ZIPダウンロードは準備中です。
      </p>
    </div>
  </div>
</template>
