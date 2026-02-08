<script setup lang="ts">
import type { StyleOption } from '~~/shared/types/components/page/home';

const generationStore = useGenerationStore();

const styles: readonly StyleOption[] = [
  {
    value: '3d-anime',
    label: '3Dアニメ',
    description: 'プロが描いたような3Dキャラクター風'
  },
  {
    value: 'watercolor',
    label: '水彩画',
    description: '柔らかく優しい水彩画風'
  },
  {
    value: 'fluffy',
    label: 'ゆるふわ手書き',
    description: '温かみのある手書き風'
  },
  {
    value: 'cyberpunk',
    label: 'サイバーパンク',
    description: '未来的でカッコいいネオン風'
  },
  {
    value: 'korean-style',
    label: '韓国風',
    description: 'カラフルで可愛いK-スタイル'
  },
  {
    value: 'simple-illustration',
    label: 'シンプルイラスト',
    description: 'シンプルで使いやすいミニマル風'
  }
];

const selectedStyle = computed({
  get: () => generationStore.selectedStyle,
  set: (value) => {
    generationStore.setSelectedStyle(value);
  }
});
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">
      スタイルを選択
    </h2>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <UButton
        v-for="style in styles"
        :key="style.value"
        :variant="selectedStyle === style.value ? 'solid' : 'outline'"
        color="primary"
        class="flex flex-col items-center justify-center"
        @click="selectedStyle = style.value"
      >
        <UIcon
          v-if="style.icon"
          :name="style.icon"
          class="size-6"
        />
        <div class="text-center">
          <div class="font-medium">
            {{ style.label }}
          </div>
          <div class="mt-1 text-xs text-muted">
            {{ style.description }}
          </div>
        </div>
      </UButton>
    </div>
  </div>
</template>
