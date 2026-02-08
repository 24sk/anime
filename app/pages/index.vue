<script setup lang="ts">
import { useAnonSession } from '~/composables/useAnonSession'

const generationStore = useGenerationStore()
const router = useRouter()
const toast = useToast()
const { getAnonSessionId } = useAnonSession()

const isGenerating = ref(false)

const canGenerate = computed(() => {
  return generationStore.imageFile !== null && generationStore.selectedStyle !== null
})

/**
 * 画像をVercel Blobにアップロードする
 * サーバーにバイナリを送信し、返却されたBlobのurlをアクセス用URLとして返す
 * @param {File} imageFile - アップロードする画像ファイル
 * @returns {Promise<string>} アップロードされた画像のURL
 */
const uploadImageToBlob = async (imageFile: File): Promise<string> => {
  const contentType = imageFile.type || 'image/jpeg'

  // FileをArrayBufferに変換（$fetchがFileをJSON化しないようにする）
  const arrayBuffer = await imageFile.arrayBuffer()

  // サーバーにバイナリを送信。presign APIは受け取ったbodyをそのままBlobにputし、{ url, pathname, ... } を返す
  const blob = await $fetch<{ url: string }>('/api/upload/presign', {
    method: 'POST',
    query: { filename: imageFile.name || 'image.png' },
    body: arrayBuffer,
    headers: {
      'Content-Type': contentType
    }
  })

  if (!blob?.url) {
    throw new Error('アップロード後のURLを取得できませんでした')
  }
  return blob.url
}

/**
 * 画像生成APIを呼び出す
 * @param {string} anonSessionId - 匿名セッションID
 * @param {string} sourceImageUrl - アップロードされた画像のURL
 * @param {string} styleType - スタイルタイプ
 * @returns {Promise<{ job_id: string, status: string }>} ジョブIDとステータス
 */
const callGenerateAPI = async (
  anonSessionId: string,
  sourceImageUrl: string,
  styleType: string
): Promise<{ job_id: string, status: string }> => {
  const response = await $fetch<{ job_id: string, status: string }>('/api/generate', {
    method: 'POST',
    body: {
      anon_session_id: anonSessionId,
      source_image_url: sourceImageUrl,
      style_type: styleType
    }
  })

  return response
}

/**
 * 画像生成処理を開始する
 */
const handleGenerate = async () => {
  if (!canGenerate.value || isGenerating.value) {
    return
  }

  if (!generationStore.imageFile || !generationStore.selectedStyle) {
    toast.add({
      title: 'エラー',
      description: '画像とスタイルを選択してください。',
      color: 'error'
    })
    return
  }

  try {
    isGenerating.value = true
    generationStore.setStatus('generating')

    // 匿名セッションIDを取得
    const anonSessionId = getAnonSessionId()

    // 画像をVercel Blobにアップロード
    const sourceImageUrl = await uploadImageToBlob(generationStore.imageFile)

    // 画像生成APIを呼び出し
    const { job_id } = await callGenerateAPI(anonSessionId, sourceImageUrl, generationStore.selectedStyle)

    // ジョブIDをストアに保存
    generationStore.setJobId(job_id)

    // 生成中画面へ遷移
    await router.push('/generating')
  } catch (error) {
    console.error('生成エラー:', error)

    // エラーメッセージを取得
    let errorMessage = '画像の生成に失敗しました。もう一度お試しください。'
    if (error && typeof error === 'object' && 'data' in error) {
      const errorData = error.data as { message?: string }
      if (errorData?.message) {
        errorMessage = errorData.message
      }
    }

    toast.add({
      title: 'エラーが発生しました',
      description: errorMessage,
      color: 'error'
    })
    generationStore.setStatus('error')
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="space-y-8 py-8">
    <div class="text-center">
      <h2 class="mt-2 text-muted">
        「うちの子」を世界に一つだけのデジタルアートへ
      </h2>
    </div>

    <div class="mx-auto max-w-2xl space-y-6">
      <!-- 画像アップロードエリア（使い方ガイドのターゲット） -->
      <div id="tour-upload">
        <ImageUploadArea />
      </div>

      <!-- スタイルセレクター（使い方ガイドのターゲット） -->
      <div id="tour-style">
        <StyleSelector />
      </div>

      <!-- フリーテキスト入力（使い方ガイドのターゲット） -->
      <div
        id="tour-freetext"
        class="space-y-4"
      >
        <h2 class="text-lg font-semibold">
          自由にアレンジしてみよう
        </h2>
        <UTextarea
          v-model="generationStore.freeText"
          placeholder="例：リボンをつけて、笑顔で、背景をシンプルに"
          :rows="3"
          class="w-full"
        />
      </div>

      <!-- 生成ボタン（使い方ガイドのターゲット） -->
      <UButton
        id="tour-generate"
        :disabled="!canGenerate"
        :loading="isGenerating"
        block
        size="xl"
        class="rounded-3xl"
        @click="handleGenerate"
      >
        <template v-if="!isGenerating">
          アイコンを作成する
        </template>
        <template v-else>
          アイコン作成中...
        </template>
      </UButton>
    </div>
  </div>
</template>
