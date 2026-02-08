<script setup lang="ts">
/**
 * 文言選択コンポーネント（LINEスタンプ作成ページ専用）
 * プリセットから1ワードのみ単一選択、または自由入力で1文言を指定する。
 * 単語／セットタブでプリセットを表示し、単語タブ内に自由入力欄を配置。
 * @remark 仕様: docs/features/ui/line-stamp.md 5.2 文言選択ブロック
 */

import {
  RECOMMENDED_8_SET_ID,
  STAMP_GROUP_LABELS,
  STAMP_SETS,
  STAMP_WORDS
} from '~~/shared/constants/line-stamp';
import type { StampWordGroup } from '~~/shared/types/line-stamp';

/** 自由入力の最大文字数（LINEスタンプの文言として妥当な長さに制限） */
const CUSTOM_WORD_MAX_LENGTH = 20;

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

/** プリセットの単語が選択されているか（単一選択） */
function isWordSelected(wordId: string): boolean {
  return lineStampStore.selectedWordId === wordId;
}

/** 単語チップをクリックしたときの処理（単一選択：この1件のみ選択し、自由入力をクリア） */
function onWordClick(wordId: string) {
  lineStampStore.setSelectedWordId(wordId);
}

/** 自由入力の値を更新（プリセット選択をクリアしてこの文言を採用） */
function onCustomWordInput(value: string) {
  lineStampStore.setCustomWord(value.slice(0, CUSTOM_WORD_MAX_LENGTH));
}

// UTabs の items（単語 / セット）。初期表示は単語タブ、セットは Phase 1 では非活性（仕様 5.2）
const tabItems = [
  { label: '単語', value: 'words', slot: 'words' },
  { label: 'セット', value: 'sets', slot: 'sets', disabled: true }
];
</script>

<template>
  <section aria-labelledby="line-stamp-preset-heading">
    <h2
      id="line-stamp-preset-heading"
      class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      テキストを1つ選択してください
    </h2>
    <UTabs
      :items="tabItems"
      color="primary"
      variant="pill"
      class="w-full"
      :unmount-on-hide="false"
      default-value="words"
    >
      <!-- セットタブが準備中である旨をツールチップで案内 -->
      <template #list-trailing>
        <UTooltip
          text="セットタブは現在準備中です。近日中にご利用いただけます。"
          :content="{ side: 'bottom', sideOffset: 6 }"
        >
          <span
            class="inline-flex size-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="セットタブについて"
          >
            <UIcon
              name="i-lucide-info"
              class="size-4"
            />
          </span>
        </UTooltip>
      </template>
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

          <!-- 自由入力（プリセット以外の文言を1件指定）。幅・高さを広めにして入力しやすくする -->
          <div class="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              その他（自由入力）
            </h3>
            <UTextarea
              :model-value="lineStampStore.customWord"
              placeholder="例: おつかれさま"
              :maxlength="CUSTOM_WORD_MAX_LENGTH"
              :rows="3"
              size="md"
              class="w-full min-h-18 resize-y"
              aria-label="スタンプに載せる文言を自由入力"
              @update:model-value="onCustomWordInput"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400">
              最大{{ CUSTOM_WORD_MAX_LENGTH }}文字まで
            </p>
          </div>
        </div>
      </template>

      <template #sets>
        <div class="mt-3 space-y-4">
          <!-- おすすめ8個（申請用）: 各単語をチップで単一選択可能 -->
          <div
            v-if="recommendedSet"
            class="space-y-2"
          >
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              はじめての申請に
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ recommendedSet.name }}（1つ選んでください）
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="wordId in recommendedSet.wordIds"
                :key="wordId"
                :variant="isWordSelected(wordId) ? 'solid' : 'outline'"
                color="primary"
                size="sm"
                class="rounded-full"
                @click="onWordClick(wordId)"
              >
                {{ STAMP_WORDS.find(w => w.id === wordId)?.label ?? wordId }}
              </UButton>
            </div>
          </div>

          <!-- その他のセット: 各単語をチップで単一選択可能 -->
          <div class="space-y-2">
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              カテゴリ別
            </h3>
            <div
              v-for="set in otherSets"
              :key="set.id"
              class="space-y-1"
            >
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ set.name }}
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="wordId in set.wordIds"
                  :key="wordId"
                  :variant="isWordSelected(wordId) ? 'solid' : 'outline'"
                  color="primary"
                  size="sm"
                  class="rounded-full"
                  @click="onWordClick(wordId)"
                >
                  {{ STAMP_WORDS.find(w => w.id === wordId)?.label ?? wordId }}
                </UButton>
              </div>
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
