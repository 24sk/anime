<script setup lang="ts">
/**
 * LINEスタンプ AI 生成ブロック
 * 「スタンプを生成」CTA を表示し、実行中はローディング、完了後は生成結果 1 枚とダウンロードボタンを表示する。
 * プレビュー（Canvas）は廃止し、AI 生成結果のみ表示する。
 * @remark 仕様: docs/features/ui/line-stamp.md 5.2 プレビュー廃止・生成結果表示
 * @remark Phase 2: 各スタンプ・メイン画像・タブ画像の状態をスピナー/成功/エラーアイコンで視覚的に区別する（5.8.1 5. UI）
 * @remark Phase 2: 失敗した文言のみを対象とした「失敗分を再生成」操作を提供する（5.8.1 5. UI）
 */

const lineStampStore = useLineStampStore();
const generationStore = useGenerationStore();
const { getAnonSessionId } = useAnonSession();
const requestUrl = useRequestURL();

/**
 * Phase 2: 複数スタンプ生成結果をグリッド表示するためのエントリ一覧
 * - textResults が空の場合は空配列を返し、グリッドは表示しない
 * - キーは文言を一意に識別するIDまたはラベル文字列として扱う
 */
const batchTextResultEntries = computed(() => Object.entries(lineStampStore.textResults));

/**
 * Phase 2: ZIP ダウンロード可否と部分成功状況を判定するための算出プロパティ
 * - hasAnyStampFailure: 少なくとも1件以上のスタンプ生成が failed になっているか
 * - hasZipDownloadUrl: ZIP の署名付きURLが取得できているか
 * - canDownloadZip: ZIP ダウンロードボタンを有効にできるか（URLがある場合は一律で許可）
 *   - 生成が一部失敗していても「成功した分だけで ZIP ダウンロード」を許可する仕様に対応
 */
const hasAnyStampFailure = computed(() =>
  Object.values(lineStampStore.textResults).some(result => result.status === 'failed')
);
const hasZipDownloadUrl = computed(() =>
  !!lineStampStore.zipResult.downloadUrl && lineStampStore.zipResult.status === 'success'
);
/**
 * ZIPダウンロードボタンの活性状態とローディング状態を管理する算出プロパティ
 * - isZipGenerating: ZIP ファイルを準備中かどうか（署名付きURL取得前の状態）
 * - canDownloadZip: ZIP 生成が成功し、ダウンロードURLが存在する場合のみ true
 *   - 仕様 5.8.1 5. UI の「ZIP 準備中はローディング状態を表示する」に対応
 */
const isZipGenerating = computed(() => lineStampStore.zipResult.status === 'generating');
const canDownloadZip = computed(() => hasZipDownloadUrl.value && !isZipGenerating.value);

/**
 * メイン画像・タブ画像の生成ステータス用ラベルを返すヘルパー
 * - 仕様上「ZIP には常にメイン画像・タブ画像を含める」前提のため、
 *   各ステータスごとに ZIP への同梱状況が分かる文言を返す。
 * - idle: まだ生成していない状態（ZIP に含めるには生成が必要）
 * - generating: 生成処理中（完了すると ZIP に含まれる）
 * - success: 正常に生成完了し、ZIP に同梱される
 * - failed: エラーにより生成失敗（そのままでは ZIP に含まれない）
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'generating':
      return '生成中です（完了するとZIPに含まれます）';
    case 'success':
      return '生成済み（ZIPに含まれます）';
    case 'failed':
      return '生成に失敗しました（ZIPには含まれません）';
    default:
      return 'まだ生成していません（ZIPに含めるには生成が必要です）';
  }
}

/**
 * Phase 2: 失敗した文言のみを対象に再生成を開始する
 * - ストアの retryFailedTexts で失敗ステータスの項目を generating に戻しつつ、再試行対象のキー一覧を取得する
 * - 実際のバッチ生成API呼び出しは親コンポーネント側で行う想定のため、イベントでキー一覧を通知する
 */
const emit = defineEmits<{
  /**
   * 失敗したスタンプのうち、再試行可能な文言キー一覧を親に通知するイベント
   * - 親側で /api/line-stamp/export 等のバッチAPIに再送する際の入力として利用する
   */
  (e: 'retry-failed-texts', payload: { keys: string[] }): void;
}>();

function onRetryFailedTexts() {
  // ストア側で失敗しているスタンプのみを再生成対象として status を generating に更新し、そのキー一覧を受け取る
  const keys = lineStampStore.retryFailedTexts();
  if (!keys.length) return;

  // 親コンポーネントでのAPI再呼び出しに使えるよう、イベントとして通知する
  emit('retry-failed-texts', { keys });
}

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

/**
 * 生成済みのZIPファイルをダウンロードする
 * - ZIP の署名付きURLが存在する場合のみアンカータグを生成してクリックする
 * - 生成が一部失敗している場合でも、成功したスタンプだけを含むZIPをそのままダウンロードできる
 */
function downloadStampZip() {
  const url = lineStampStore.zipResult.downloadUrl;
  if (!url) return;

  const link = document.createElement('a');
  link.href = url;
  link.download = 'line-stamps.zip';
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

    <!-- Phase 2: 複数スタンプ生成結果のグリッド表示（スマホ2列・PCで列数を増やす） -->
    <div
      v-if="batchTextResultEntries.length"
      class="mt-6 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <h2
          id="line-stamp-generated-list-heading"
          class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          生成されたスタンプ一覧
        </h2>
        <!-- 失敗した文言のみを対象とした一括再生成ボタン（仕様: docs/features/ui/line-stamp.md 5.8.1 5. UI） -->
        <UButton
          color="primary"
          variant="outline"
          size="xs"
          class="shrink-0"
          :disabled="!lineStampStore.hasRetryableTexts"
          :aria-disabled="!lineStampStore.hasRetryableTexts"
          @click="onRetryFailedTexts"
        >
          失敗したスタンプを再生成する
        </UButton>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <div
          v-for="([key, result]) in batchTextResultEntries"
          :key="key"
          class="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex flex-col items-center p-2 gap-1"
        >
          <!-- 各スタンプごとの状態をスピナー / 成功アイコン / エラーアイコンで表示 -->
          <div class="relative w-full flex-1 flex items-center justify-center min-h-24">
            <!-- 生成中: スピナーのみ表示 -->
            <div
              v-if="result.status === 'generating'"
              class="flex flex-col items-center justify-center gap-1"
            >
              <span
                class="inline-block size-7 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <span class="text-[10px] text-gray-500 dark:text-gray-400">
                生成中…
              </span>
            </div>
            <!-- 成功: 画像 + 右上にチェックアイコン -->
            <template v-else-if="result.status === 'success' && result.imageUrl">
              <NuxtImg
                :src="result.imageUrl"
                :alt="`${key} のLINEスタンプ画像`"
                width="200"
                height="200"
                class="w-full h-auto object-contain"
              />
              <Icon
                name="lucide:check-circle-2"
                class="absolute top-1 right-1 text-emerald-500 size-5"
                aria-hidden="true"
              />
            </template>
            <!-- 失敗: エラーアイコンと短いメッセージ -->
            <div
              v-else-if="result.status === 'failed'"
              class="flex flex-col items-center justify-center gap-1 text-center px-1"
            >
              <Icon
                name="lucide:alert-circle"
                class="text-red-500 size-6"
                aria-hidden="true"
              />
              <span class="text-[10px] text-red-500">
                エラーが発生しました
              </span>
            </div>
            <!-- 未生成: 時計アイコンで待機状態を表示 -->
            <div
              v-else
              class="flex flex-col items-center justify-center gap-1 text-center px-1"
            >
              <Icon
                name="lucide:clock-3"
                class="text-gray-400 dark:text-gray-500 size-5"
                aria-hidden="true"
              />
              <span class="text-[10px] text-gray-500 dark:text-gray-400">
                まだ生成していません
              </span>
            </div>
          </div>
          <p
            class="mt-1 text-xs text-gray-700 dark:text-gray-300 text-center truncate w-full"
            :title="key"
          >
            {{ key }}
          </p>
        </div>
      </div>
    </div>

    <!-- Phase 2: メイン画像・タブ画像の状態表示（スピナー / 成功 / エラーアイコンで区別） -->
    <section
      class="mt-6 space-y-3"
      aria-labelledby="line-stamp-main-tab-heading"
    >
      <h2
        id="line-stamp-main-tab-heading"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        メイン画像・タブ画像の状態
      </h2>
      <div class="grid grid-cols-2 gap-3">
        <!-- メイン画像の状態 -->
        <div class="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 space-y-1">
          <p class="text-xs font-medium text-gray-700 dark:text-gray-300">
            メイン画像
          </p>
          <div class="flex items-center gap-2 mt-1">
            <span
              v-if="lineStampStore.mainImageResult.status === 'generating'"
              class="inline-block size-5 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <Icon
              v-else-if="lineStampStore.mainImageResult.status === 'success'"
              name="lucide:check-circle-2"
              class="text-emerald-500 size-5"
              aria-hidden="true"
            />
            <Icon
              v-else-if="lineStampStore.mainImageResult.status === 'failed'"
              name="lucide:alert-circle"
              class="text-red-500 size-5"
              aria-hidden="true"
            />
            <Icon
              v-else
              name="lucide:clock-3"
              class="text-gray-400 dark:text-gray-500 size-5"
              aria-hidden="true"
            />
            <p class="text-[11px] text-gray-600 dark:text-gray-400">
              {{ getStatusLabel(lineStampStore.mainImageResult.status) }}
            </p>
          </div>
        </div>

        <!-- タブ画像の状態 -->
        <div class="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 space-y-1">
          <p class="text-xs font-medium text-gray-700 dark:text-gray-300">
            タブ画像
          </p>
          <div class="flex items-center gap-2 mt-1">
            <span
              v-if="lineStampStore.tabImageResult.status === 'generating'"
              class="inline-block size-5 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <Icon
              v-else-if="lineStampStore.tabImageResult.status === 'success'"
              name="lucide:check-circle-2"
              class="text-emerald-500 size-5"
              aria-hidden="true"
            />
            <Icon
              v-else-if="lineStampStore.tabImageResult.status === 'failed'"
              name="lucide:alert-circle"
              class="text-red-500 size-5"
              aria-hidden="true"
            />
            <Icon
              v-else
              name="lucide:clock-3"
              class="text-gray-400 dark:text-gray-500 size-5"
              aria-hidden="true"
            />
            <p class="text-[11px] text-gray-600 dark:text-gray-400">
              {{ getStatusLabel(lineStampStore.tabImageResult.status) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Phase 2: ZIP ダウンロードブロック
         - ZIP 生成が完了して署名付きURLが取得できたら「スタンプを ZIP でダウンロード」を主CTAとして表示
         - ZIP 準備中はローディング状態を表示し、完了後にダウンロードを有効化する
         - 一部のスタンプ生成が失敗している場合は、成功した分だけがZIPに含まれる旨を敬体で案内する -->
    <section
      v-if="lineStampStore.zipResult.status === 'generating' || hasZipDownloadUrl"
      class="mt-6 space-y-3"
      aria-labelledby="line-stamp-zip-download-heading"
    >
      <h2
        id="line-stamp-zip-download-heading"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        スタンプを ZIP でダウンロード
      </h2>
      <p
        v-if="lineStampStore.zipResult.status === 'generating'"
        class="text-xs text-gray-600 dark:text-gray-400"
      >
        ZIPファイルを準備しています。完了するとボタンからダウンロードできるようになります。
      </p>
      <p
        v-else-if="hasAnyStampFailure"
        class="text-xs text-gray-600 dark:text-gray-400"
      >
        一部のスタンプ画像の生成に失敗しましたが、成功したスタンプだけを ZIP にまとめてダウンロードできます。
      </p>
      <div class="flex justify-center">
        <UButton
          color="primary"
          variant="solid"
          size="lg"
          class="rounded-3xl"
          :disabled="!canDownloadZip && !isZipGenerating"
          :aria-disabled="!canDownloadZip && !isZipGenerating"
          @click="!isZipGenerating ? downloadStampZip() : undefined"
        >
          <template v-if="isZipGenerating">
            <span
              class="inline-block mr-2 size-5 border-3 border-primary-50 border-t-primary-500 rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>
              ZIPを準備中です…
            </span>
          </template>
          <template v-else>
            スタンプを ZIP でダウンロード
          </template>
        </UButton>
      </div>
    </section>

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
