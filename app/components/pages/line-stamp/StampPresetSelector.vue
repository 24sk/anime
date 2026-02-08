<script setup lang="ts">
/**
 * 文言選択コンポーネント（LINEスタンプ作成ページ専用）
 * 単語／セットのタブ切り替え、プリセットのチップ表示・複数選択、
 * おすすめ8個セットを目立つ位置に配置し1クリックで申請最小構成を選択可能にする。
 * @remark 仕様: docs/features/ui/line-stamp.md 5.2 文言選択ブロック
 */

import {
  RECOMMENDED_8_SET_ID,
  STAMP_GROUP_LABELS,
  STAMP_SETS,
  STAMP_WORDS
} from '~~/shared/constants/line-stamp';
import type { StampWordGroup } from '~~/shared/types/line-stamp';

const lineStampStore = useLineStampStore();

// 単語タブ用: グループごとに単語をまとめる（表示順は STAMP_GROUP_LABELS のキー順）
const GROUP_ORDER: StampWordGroup[] = [
  'aisatsu',
  'kansha',
  'reaction',
  'oen',
  'ai_follow',
  'gomen_follow'
];

const wordsByGroup = computed(() => {
  const map = new Map<StampWordGroup, { id: string; label: string; group: StampWordGroup }[]>();
  for (const word of STAMP_WORDS) {
    if (!GROUP_ORDER.includes(word.group)) continue;
    const list = map.get(word.group);
    if (list) list.push(word);
    else map.set(word.group, [word]);
  }
  return GROUP_ORDER.map(g => ({ group: g, words: map.get(g) ?? [] })).filter(
    x => x.words.length > 0
  );
});

// おすすめ8個セットとその他のセットに分離（おすすめ8個を先頭に表示）
const recommendedSet = computed(
  () => STAMP_SETS.find(s => s.id === RECOMMENDED_8_SET_ID)
);
const otherSets = computed(() =>
  STAMP_SETS.filter(s => s.id !== RECOMMENDED_8_SET_ID)
);

// 選択中IDのSet（テンプレート・関数内でリアクティブに参照するため computed で包む）
const selectedSet = computed(() => lineStampStore.selectedWordIdSet);

/** 単語が選択されているか */
function isWordSelected(wordId: string): boolean {
  return selectedSet.value.has(wordId);
}

/** セット内の単語がすべて選択されているか */
function isSetFullySelected(wordIds: readonly string[]): boolean {
  return wordIds.length > 0 && wordIds.every(id => selectedSet.value.has(id));
}

/** 単語チップをクリックしたときの処理 */
function onWordClick(wordId: string) {
  lineStampStore.toggleWord(wordId);
}

/** セットをクリックしたときの処理（一括トグル） */
function onSetClick(wordIds: readonly string[]) {
  lineStampStore.toggleSet(wordIds);
}

// UTabs の items（単語 / セット）
const tabItems = [
  { label: '単語', value: 'words', slot: 'words' },
  { label: 'セット', value: 'sets', slot: 'sets' }
];
</script>

<template>
  <section aria-labelledby="line-stamp-preset-heading">
    <h2
      id="line-stamp-preset-heading"
      class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      文言を選択
    </h2>
    <UTabs
      :items="tabItems"
      color="primary"
      variant="pill"
      class="w-full"
      :unmount-on-hide="false"
    >
      <template #words>
        <div class="mt-3 space-y-4">
          <div
            v-for="{ group, words } in wordsByGroup"
            :key="group"
            class="space-y-2"
          >
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ STAMP_GROUP_LABELS[group] }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="word in words"
                :key="word.id"
                :variant="isWordSelected(word.id) ? 'solid' : 'outline'"
                color="primary"
                size="sm"
                class="rounded-full"
                @click="onWordClick(word.id)"
              >
                {{ word.label }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #sets>
        <div class="mt-3 space-y-4">
          <!-- おすすめ8個（申請用）を目立つ位置に配置 -->
          <div
            v-if="recommendedSet"
            class="space-y-2"
          >
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              はじめての申請に
            </h3>
            <UCard
              class="cursor-pointer transition-opacity hover:opacity-90"
              :class="
                isSetFullySelected(recommendedSet.wordIds)
                  ? 'ring-2 ring-primary-500'
                  : ''
              "
              @click="onSetClick(recommendedSet.wordIds)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium">
                  {{ recommendedSet.name }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ recommendedSet.wordIds.length }}個
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                LINE申請の最小構成を1クリックで選択
              </p>
            </UCard>
          </div>

          <!-- その他のセット（あいさつ・感謝・リアクション等） -->
          <div class="space-y-2">
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              カテゴリ別セット
            </h3>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="set in otherSets"
                :key="set.id"
                :variant="isSetFullySelected(set.wordIds) ? 'solid' : 'outline'"
                color="primary"
                size="sm"
                class="rounded-full"
                @click="onSetClick(set.wordIds)"
              >
                {{ set.name }}（{{ set.wordIds.length }}）
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UTabs>
  </section>
</template>

<style scoped lang="scss">
/* 文言選択ブロック：既存デザインシステムに合わせる */
</style>
