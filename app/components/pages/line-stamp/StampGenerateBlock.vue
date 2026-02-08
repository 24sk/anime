<script setup lang="ts">
/**
 * LINEスタンプ AI 生成ブロック
 * 「スタンプを生成」CTA を表示し、実行中はローディング、完了後は生成結果 1 枚とダウンロードボタンを表示する。
 * プレビュー（Canvas）は廃止し、AI 生成結果のみ表示する。
 * @remark 仕様: docs/features/ui/line-stamp.md 5.2 プレビュー廃止・生成結果表示
 */

const generationStore = useGenerationStore();
const lineStampStore = useLineStampStore();
const { getAnonSessionId } = useAnonSession();
const requestUrl = useRequestURL();

/** 生成 API を呼び出し、結果をストアに反映する */
async function generateStamp() {
  const imageUrl = generationStore.resultImageUrl;
  const label = lineStampStore.effectiveLabel;
  if (!imageUrl || !label) return;

  lineStampStore.startGeneratingStamp();

  // サーバーが取得できる絶対 URL を渡す（相対パスの場合はオリジン付きに変換）
  const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${requestUrl.origin}${imageUrl}`;

  const body: {
    anon_session_id: string;
    image_url: string;
    word_id?: string;
    custom_label?: string;
  } = {
    anon_session_id: getAnonSessionId(),
    image_url: absoluteImageUrl
  };
  if (lineStampStore.customWord.trim()) {
    body.custom_label = lineStampStore.customWord.trim();
  } else if (lineStampStore.selectedWordId) {
    body.word_id = lineStampStore.selectedWordId;
  }

  try {
    const res = await $fetch<{ result_image_url: string }>('/api/line-stamp/generate', {
      method: 'POST',
      body
    });
    lineStampStore.setGeneratedStampImageUrl(res.result_image_url);
  } catch (error: unknown) {
    const message
      = error && typeof error === 'object' && error !== null && 'data' in error
        && typeof (error as { data?: { message?: string } }).data?.message === 'string'
        ? (error as { data: { message: string } }).data.message
        : 'スタンプの生成に失敗しました。時間を置いてやり直してください。';
    lineStampStore.setGenerateError(message);
  }
}

/** 生成結果画像を PNG としてダウンロードする */
function downloadStampImage() {
  const url = lineStampStore.generatedStampImageUrl;
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = `line-stamp-${lineStampStore.effectiveLabel.replace(/\s/g, '_') || 'stamp'}.png`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <section aria-labelledby="line-stamp-generate-heading">
    <!-- CTA: 文言選択済みかつ未生成・未ローディング時。単語未選択時は非活性（仕様: docs/features/ui/line-stamp.md） -->
    <div
      v-if="!lineStampStore.isGeneratingStamp && !lineStampStore.generatedStampImageUrl"
      class="flex justify-center py-4"
    >
      <UButton
        size="lg"
        block
        color="neutral"
        variant="solid"
        icon="i-simple-icons-line"
        class="rounded-3xl w-full bg-[#06C755]! text-white! hover:bg-[#05a84a]!"
        :disabled="!lineStampStore.hasSelection"
        :aria-disabled="!lineStampStore.hasSelection"
        :title="lineStampStore.hasSelection ? undefined : '文言を選択してください'"
        @click="generateStamp"
      >
        スタンプを生成
      </UButton>
    </div>

    <!-- 生成中表示（数十秒想定のためローディングを明確に） -->
    <div
      v-else-if="lineStampStore.isGeneratingStamp"
      class="py-8 flex flex-col items-center justify-center gap-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
    >
      <span
        class="inline-block size-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      <p class="text-sm text-gray-600 dark:text-gray-400">
        AI がスタンプ画像を生成しています…（数十秒かかることがあります）
      </p>
    </div>

    <!-- 生成完了: 結果 1 枚 ＋ ダウンロード -->
    <div
      v-else-if="lineStampStore.generatedStampImageUrl"
      class="space-y-4"
    >
      <div class="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex justify-center">
        <NuxtImg
          :src="lineStampStore.generatedStampImageUrl"
          alt="生成されたLINEスタンプ画像"
          width="370"
          height="320"
          class="max-w-full h-auto object-contain"
        />
      </div>
      <div class="flex justify-center">
        <UButton
          color="primary"
          variant="solid"
          size="lg"
          class="rounded-3xl"
          @click="downloadStampImage"
        >
          画像をダウンロード
        </UButton>
      </div>
    </div>

    <!-- エラー表示 -->
    <UAlert
      v-if="lineStampStore.generateError"
      color="error"
      variant="soft"
      :title="lineStampStore.generateError"
      class="mt-4"
    />
  </section>
</template>

<style scoped lang="scss">
/* スタンプ生成CTAは result の「LINEスタンプ用に作る」と同様の UButton + LINE カラーで表示 */
</style>
