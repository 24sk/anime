<!--
  画面2：生成中画面（広告・待機演出）
  離脱を防ぎつつ広告を確実に閲覧してもらうための画面。
  プログレスシミュレーション・ステータスメッセージ・広告枠・最低待機10秒・Realtimeで完了検知し結果画面へ遷移。
-->
<script setup lang="ts">
const generationStore = useGenerationStore();
const router = useRouter();
const route = useRoute();
const supabase = useSupabase();
const toast = useToast();

/** 開発時のみ: 画面表示確認用プレビューモード（?preview=1 でリダイレクト・APIをスキップ） */
const isPreviewMode
  = import.meta.dev
    && route.query.preview === '1';

useSeoMeta({ title: '生成中' });

/** 最低待機時間（ミリ秒）。生成完了後もこの時間が経過するまで次へ進まない */
const MIN_WAIT_MS = 10_000;

/** 進捗シミュレーション 0〜100。実際のAPI進捗ではなく演出用 */
const progress = ref(0);

/**
 * 進捗（0〜100）に応じたステータスメッセージの定義
 * 画像変換の流れに沿って順に表示し、ユーザーに正確な進捗感を伝える
 */
const PROGRESS_MESSAGES: { max: number; message: string }[] = [
  { max: 15, message: '準備しています...' },
  { max: 30, message: '毛並みを整えています...' },
  { max: 50, message: '魔法をかけています...' },
  { max: 65, message: 'お顔をかわいくしています...' },
  { max: 80, message: '色を塗っています...' },
  { max: 95, message: '仕上げ中です...' },
  { max: 100, message: 'もう少しお待ちください...' }
];

/**
 * 現在の進捗値に応じたステータスメッセージを返す
 * @param p - 進捗（0〜100）
 * @returns 表示するメッセージ
 */
function getMessageForProgress(p: number): string {
  const entry = PROGRESS_MESSAGES.find(e => p <= e.max);
  return entry?.message ?? PROGRESS_MESSAGES[PROGRESS_MESSAGES.length - 1]!.message;
}

/** 進捗に応じてステータスメッセージを切り替える（computed で常に同期） */
const statusMessage = computed(() => getMessageForProgress(progress.value));

/** ページ表示開始時刻。最低待機時間の計算に使用 */
const startedAt = ref(0);
/** クリーンアップ用：タイマーID・Realtimeチャンネル・ポーリング用 */
const progressIntervalId = ref<ReturnType<typeof setInterval> | null>(null);
let navigateCheckTimerId: ReturnType<typeof setInterval> | null = null;
let realtimeChannel: { unsubscribe: () => void } | null = null;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * 生成中・完了待ちの間は戻る・ブラウザバックを無効にする
 * エラー時は「もう一度やり直す」で離脱できるように許可する
 */
onBeforeRouteLeave((_to, _from, next) => {
  if (generationStore.status === 'generating' || generationStore.status === 'completed') {
    toast.add({
      title: '生成が完了するまでお待ちください',
      color: 'warning'
    });
    next(false);
    return;
  }
  next();
});

/** 結果画面へ遷移してよいか判定し、条件を満たしていれば遷移する */
function tryNavigateToResult() {
  if (generationStore.status !== 'completed') return;
  const elapsed = Date.now() - startedAt.value;
  if (elapsed >= MIN_WAIT_MS) {
    if (navigateCheckTimerId) {
      clearInterval(navigateCheckTimerId);
      navigateCheckTimerId = null;
    }
    router.push('/result');
  }
}

/** ジョブ状態APIのレスポンス型 */
type JobStatusResponse = {
  job_id: string;
  status: string;
  result_image_url: string | null;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
};

/**
 * ジョブ状態を取得し、完了・失敗ならストアを更新する（Realtimeが届かない場合のフォールバック）
 * @param {string} jobId - ジョブID
 * @returns {Promise<boolean>} 終了状態（completed/failed）になったら true
 */
async function fetchJobStatus(jobId: string): Promise<boolean> {
  try {
    const res = await $fetch<JobStatusResponse>(`/api/jobs/${jobId}`);
    if (res.status === 'completed') {
      generationStore.setStatus('completed');
      generationStore.setResultImageUrl(res.result_image_url ?? null);
      progress.value = 100;
      if (!navigateCheckTimerId) {
        navigateCheckTimerId = setInterval(tryNavigateToResult, 500);
      }
      return true;
    }
    if (res.status === 'failed') {
      generationStore.setStatus('error');
      generationStore.setErrorMessage(
        res.error_message?.trim() || '生成に失敗しました。もう一度やり直してください。'
      );
      return true;
    }
  } catch {
    // ネットワークエラー等は無視し、次回のポーリングで再試行
  }
  return false;
}

onMounted(() => {
  // 開発時プレビュー: エラー表示を確認する（?preview=1&error=1）
  if (isPreviewMode && route.query.error === '1') {
    generationStore.setStatus('error');
    generationStore.setErrorMessage('プレビュー用のエラーメッセージです。');
    return;
  }

  // 通常時は jobId が無ければホームへリダイレクト
  let jobId = generationStore.jobId;
  /** プレビューで表示のみ確認している場合（Realtime・ポーリングをスキップ） */
  let previewDisplayOnly = false;
  if (!jobId) {
    if (isPreviewMode) {
      jobId = '00000000-0000-0000-0000-000000000000';
      generationStore.setJobId(jobId);
      generationStore.setStatus('generating');
      previewDisplayOnly = true;
    } else {
      router.replace('/');
      return;
    }
  }

  startedAt.value = Date.now();

  // プログレスバーを0→100へ約14秒でシミュレーション（AI処理進捗の演出）
  const progressStep = 100 / (14_000 / 180);
  progressIntervalId.value = setInterval(() => {
    progress.value = Math.min(100, Math.round(progress.value + progressStep));
    if (progress.value >= 100 && progressIntervalId.value) {
      clearInterval(progressIntervalId.value);
      progressIntervalId.value = null;
    }
  }, 180);

  // ステータスメッセージは progress に連動する computed のため、ここでは何もしない

  // プレビュー表示のみの場合は Realtime・ポーリングは行わない
  if (!previewDisplayOnly) {
    // Supabase Realtime: generation_jobs の当該ジョブを購読し、完了を検知
    realtimeChannel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generation_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const row = payload.new as {
            status?: string;
            result_image_url?: string | null;
            error_message?: string | null;
          };
          if (row.status === 'completed') {
            generationStore.setStatus('completed');
            generationStore.setResultImageUrl(row.result_image_url ?? null);
            progress.value = 100;
            if (!navigateCheckTimerId) {
              navigateCheckTimerId = setInterval(tryNavigateToResult, 500);
            }
          }
          if (row.status === 'failed') {
            generationStore.setStatus('error');
            // バックエンドが保存したユーザー向けメッセージを表示（未設定時は既定文言）
            generationStore.setErrorMessage(
              row.error_message?.trim() || '生成に失敗しました。もう一度やり直してください。'
            );
          }
        }
      )
      .subscribe();

    // ポーリング: Realtime が届かない環境でも完了・失敗を検知する（約2.5秒ごと）
    const POLL_INTERVAL_MS = 2500;
    pollIntervalId = setInterval(async () => {
      if (generationStore.status !== 'generating' && generationStore.status !== 'idle') return;
      const done = await fetchJobStatus(jobId);
      if (done && pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    }, POLL_INTERVAL_MS);
  }
});

onUnmounted(() => {
  if (progressIntervalId.value) clearInterval(progressIntervalId.value);
  if (navigateCheckTimerId) clearInterval(navigateCheckTimerId);
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  realtimeChannel?.unsubscribe();
});
</script>

<template>
  <div class="relative min-h-[60vh] py-8">
    <div class="relative z-10 mx-auto max-w-lg space-y-8">
      <!-- 生成失敗時: エラーメッセージとやり直しリンク -->
      <template v-if="generationStore.status === 'error'">
        <UAlert
          color="error"
          variant="subtle"
          title="生成に失敗しました"
          :description="generationStore.errorMessage || 'もう一度やり直してください。'"
          class="rounded-lg"
        />
        <div class="flex justify-center">
          <UButton
            color="primary"
            variant="solid"
            @click="() => { generationStore.reset(); router.push('/') }"
          >
            もう一度やり直す
          </UButton>
        </div>
      </template>

      <!-- 通常時: 生成中表示 -->
      <template v-else>
        <div class="text-center">
          <h1 class="text-xl font-semibold">
            アイコンを作成しています
          </h1>
          <p class="mt-1 text-muted text-sm">
            しばらくお待ちください<span
              class="generating-dots"
              aria-hidden="true"
            ><span>.</span><span>.</span><span>.</span></span>
          </p>
        </div>

        <!-- プログレスバーとステータスメッセージ -->
        <GeneratingProgress
          :progress="progress"
          :status-message="statusMessage"
        />

        <!-- メイン広告エリア（画面中央の最も目立つ位置） -->
        <GeneratingAdArea />
      </template>
    </div>

    <!-- 最低待機時間が経過し、かつ生成完了するまで「次へ」は表示しない（自動遷移のため） -->
  </div>
</template>

<style scoped lang="scss">
/* 三点リーダーを左から右に順に強調し、アイコン作成中であることが分かるようにする */
.generating-dots {
  display: inline;

  span {
    animation: generating-dot-pulse 1.2s ease-in-out infinite;
  }

  span:nth-child(2) {
    animation-delay: 0.2s;
  }

  span:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes generating-dot-pulse {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 1;
  }
}
</style>
