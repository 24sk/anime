<script setup lang="ts">
/**
 * 画像アップロードエリアコンポーネント
 * NuxtUIのUFileUploadコンポーネントを使用して画像をアップロードする
 */
import { useGenerationStore } from '~/stores/generation'

const generationStore = useGenerationStore()

/**
 * ファイルが選択されたときに呼び出される
 * Piniaストアに画像ファイルを設定し、プレビュー画像を生成する
 */
const handleFileChange = (file: File | null | undefined) => {
  if (file && file.type.startsWith('image/')) {
    generationStore.setImageFile(file)
  } else {
    generationStore.setImageFile(null)
  }
}
</script>

<template>
  <UFileUpload
    :model-value="generationStore.imageFile"
    accept="image/*"
    icon="i-lucide-image-plus"
    label="可愛い写真を選んでね"
    description="ドラッグ&ドロップまたはクリックして選択"
    variant="area"
    :preview="true"
    highlight
    :ui="{
      base: 'min-h-64'
    }"
    @update:model-value="handleFileChange"
  />
</template>
