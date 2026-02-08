<!--
  画面2：生成中画面（広告・待機演出）
  離脱を防ぎつつ広告を確実に閲覧してもらうための画面。
  プログレスシミュレーション・ステータスメッセージ・広告枠・最低待機10秒・Realtimeで完了検知し結果画面へ遷移。
-->
<script setup lang="ts">
const generationStore = useGenerationStore()
const router = useRouter()
const supabase = useSupabase()

useHead({
  title: '生成中 - AniMe'
})

/** 最低待機時間（ミリ秒）。生成完了後もこの時間が経過するまで次へ進まない */
const MIN_WAIT_MS = 10_000

/** 進捗シミュレーション 0〜100。実際のAPI進捗ではなく演出用 */
const progress = ref(0)
/** ランダムに切り替えるステータスメッセージ */
const statusMessage = ref('準備しています...')

/** ステータスメッセージの候補（仕様に沿った文言） */
const STATUS_MESSAGES = [
  '毛並みを整えています...',
  '魔法をかけています...',
  'お顔をかわいくしています...',
  '色を塗っています...',
  '仕上げ中です...',
  'もう少しお待ちください...'
] as const

/** ランダムで次のメッセージを返す */
function pickRandomMessage(): string {
  const i = Math.floor(Math.random() * STATUS_MESSAGES.length)
  return STATUS_MESSAGES[i] ?? STATUS_MESSAGES[0]
}

/** ページ表示開始時刻。最低待機時間の計算に使用 */
const startedAt = ref(0)
/** クリーンアップ用：タイマーID・Realtimeチャンネル・ポーリング用 */
const progressIntervalId = ref<ReturnType<typeof setInterval> | null>(null)
const messageIntervalId = ref<ReturnType<typeof setInterval> | null>(null)
let navigateCheckTimerId: ReturnType<typeof setInterval> | null = null
let realtimeChannel: { unsubscribe: () => void } | null = null
let pollIntervalId: ReturnType<typeof setInterval> | null = null

/** 結果画面へ遷移してよいか判定し、条件を満たしていれば遷移する */
function tryNavigateToResult() {
  if (generationStore.status !== 'completed') return
  const elapsed = Date.now() - startedAt.value
  if (elapsed >= MIN_WAIT_MS) {
    if (navigateCheckTimerId) {
      clearInterval(navigateCheckTimerId)
      navigateCheckTimerId = null
    }
    router.push('/result')
  }
}

/** ジョブ状態APIのレスポンス型 */
type JobStatusResponse = {
  job_id: string
  status: string
  result_image_url: string | null
  error_message: string | null
  created_at: string | null
  completed_at: string | null
}

/**
 * ジョブ状態を取得し、完了・失敗ならストアを更新する（Realtimeが届かない場合のフォールバック）
 * @param {string} jobId - ジョブID
 * @returns {Promise<boolean>} 終了状態（completed/failed）になったら true
 */
async function fetchJobStatus(jobId: string): Promise<boolean> {
  try {
    const res = await $fetch<JobStatusResponse>(`/api/jobs/${jobId}`)
    if (res.status === 'completed') {
      generationStore.setStatus('completed')
      generationStore.setResultImageUrl(res.result_image_url ?? null)
      progress.value = 100
      if (!navigateCheckTimerId) {
        navigateCheckTimerId = setInterval(tryNavigateToResult, 500)
      }
      return true
    }
    if (res.status === 'failed') {
      generationStore.setStatus('error')
      generationStore.setErrorMessage(
        res.error_message?.trim() || '生成に失敗しました。もう一度やり直してください。'
      )
      return true
    }
  } catch {
    // ネットワークエラー等は無視し、次回のポーリングで再試行
  }
  return false
}

onMounted(() => {
  const jobId = generationStore.jobId
  if (!jobId) {
    router.replace('/')
    return
  }

  startedAt.value = Date.now()

  // プログレスバーを0→100へ約14秒でシミュレーション（AI処理進捗の演出）
  const progressStep = 100 / (14_000 / 180)
  progressIntervalId.value = setInterval(() => {
    progress.value = Math.min(100, Math.round(progress.value + progressStep))
    if (progress.value >= 100 && progressIntervalId.value) {
      clearInterval(progressIntervalId.value)
      progressIntervalId.value = null
    }
  }, 180)

  // ステータスメッセージを約2.5秒ごとにランダム切り替え
  statusMessage.value = pickRandomMessage()
  messageIntervalId.value = setInterval(() => {
    statusMessage.value = pickRandomMessage()
  }, 2500)

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
          status?: string
          result_image_url?: string | null
          error_message?: string | null
        }
        if (row.status === 'completed') {
          generationStore.setStatus('completed')
          generationStore.setResultImageUrl(row.result_image_url ?? null)
          progress.value = 100
          if (!navigateCheckTimerId) {
            navigateCheckTimerId = setInterval(tryNavigateToResult, 500)
          }
        }
        if (row.status === 'failed') {
          generationStore.setStatus('error')
          // バックエンドが保存したユーザー向けメッセージを表示（未設定時は既定文言）
          generationStore.setErrorMessage(
            row.error_message?.trim() || '生成に失敗しました。もう一度やり直してください。'
          )
        }
      }
    )
    .subscribe()

  // ポーリング: Realtime が届かない環境でも完了・失敗を検知する（約2.5秒ごと）
  const POLL_INTERVAL_MS = 2500
  pollIntervalId = setInterval(async () => {
    if (generationStore.status !== 'generating' && generationStore.status !== 'idle') return
    const done = await fetchJobStatus(jobId)
    if (done && pollIntervalId) {
      clearInterval(pollIntervalId)
      pollIntervalId = null
    }
  }, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (progressIntervalId.value) clearInterval(progressIntervalId.value)
  if (messageIntervalId.value) clearInterval(messageIntervalId.value)
  if (navigateCheckTimerId) clearInterval(navigateCheckTimerId)
  if (pollIntervalId) {
    clearInterval(pollIntervalId)
    pollIntervalId = null
  }
  realtimeChannel?.unsubscribe()
})
</script>

<template>
  <div class="relative min-h-[60vh] py-8">
    <!-- 足跡が歩き回る背景アニメーション（ブランドイメージのローディング演出） -->
    <FootprintBackground />

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
            しばらくお待ちください
          </p>
        </div>

        <!-- プログレスバーとステータスメッセージ -->
        <PagesGeneratingGeneratingProgress
          :progress="progress"
          :status-message="statusMessage"
        />

        <!-- メイン広告エリア（画面中央の最も目立つ位置） -->
        <PagesGeneratingGeneratingAdArea />
      </template>
    </div>

    <!-- 最低待機時間が経過し、かつ生成完了するまで「次へ」は表示しない（自動遷移のため） -->
  </div>
</template>
