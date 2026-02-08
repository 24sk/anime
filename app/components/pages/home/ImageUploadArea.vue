<script setup lang="ts">
/**
 * 画像アップロードエリアコンポーネント
 * NuxtUIのUFileUploadコンポーネントを使用して画像をアップロードする
 * ファイルサイズはVercelサーバーレス制限に合わせ4.5MBまで
 */
import { MAX_IMAGE_SIZE_BYTES } from '~~/shared/constants/upload'
import { useGenerationStore } from '~/stores/generation'

const generationStore = useGenerationStore()
const toast = useToast()

/**
 * ファイルが選択されたときに呼び出される
 * サイズ制限（4.5MB）と画像形式をチェックし、Piniaストアに設定する
 * 超過時はトーストで通知し、ストアはクリアする
 */
const handleFileChange = (file: File | null | undefined) => {
  if (!file) {
    generationStore.setImageFile(null)
    return
  }
  if (!file.type.startsWith('image/')) {
    generationStore.setImageFile(null)
    return
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    toast.add({
      title: 'ファイルが大きすぎます',
      description: '画像は4.5MBまでです。別の写真を選んでください。',
      color: 'error'
    })
    generationStore.setImageFile(null)
    return
  }
  generationStore.setImageFile(file)
}
</script>

<template>
  <UFileUpload
    :model-value="generationStore.imageFile"
    accept="image/*"
    icon="i-lucide-image-plus"
    label="可愛い写真を選んでね"
    description="ドラッグ&ドロップまたはクリックして選択（4.5MBまで）"
    variant="area"
    :preview="true"
    highlight
    :ui="{
      base: 'min-h-64'
    }"
    @update:model-value="handleFileChange"
  />
</template>
