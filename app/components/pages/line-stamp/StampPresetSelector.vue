<script setup lang="ts">
/**
 * 文言選択コンポーネント（LINEスタンプ作成ページ専用）
 * - Phase 1: プリセットから1ワードのみ単一選択、または自由入力で1文言を指定する。
 * - Phase 2: プリセットから複数ワード選択・複数自由入力を許可し、最大40個までの文言を扱う。
 * 単語／セットタブでプリセットを表示し、単語タブ内に自由入力欄を配置する。
 * また、「テキストを選択してください」セクションの上に、
 * Phase 2 で利用するスタンプ枚数選択（8 / 16 / 24 / 32 / 40、初期値 8）を表示する。
 * 上限40枚のルールは shared 定数（MAX_LINE_STAMP_PER_REQUEST）で UI・API と共有する。
 * @remark 仕様: docs/features/ui/line-stamp.md 5.2 文言選択ブロック, 5.8.1 仕様・制約
 */

import {
  MAX_LINE_STAMP_PER_REQUEST,
  RECOMMENDED_8_SET_ID,
  STAMP_GROUP_LABELS,
  STAMP_SETS,
  STAMP_WORDS
} from '~~/shared/constants/line-stamp';
import type { StampSet, StampWordGroup } from '~~/shared/types/line-stamp';

/** 自由入力の最大文字数（LINEスタンプの文言として妥当な長さに制限） */
const CUSTOM_WORD_MAX_LENGTH = 20;

const lineStampStore = useLineStampStore();

/**
 * 複数スタンプ生成時にユーザーが選択できる枚数の候補
 * Phase 2 の「生成枚数 8 / 16 / 24 / 32 / 40」仕様に対応（初期値は 8）
 */
const STAMP_COUNT_OPTIONS = [8, 16, 24, 32, MAX_LINE_STAMP_PER_REQUEST] as const;

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

/**
 * 複数スタンプ生成時に選択されている文言数
 * - プリセット単語（selectedWordIds）と複数自由入力（customWords）の合計数
 * - 上限は「作成するLINEスタンプ数」で選択した値と
 *   MAX_LINE_STAMP_PER_REQUEST（40件）の小さい方まで
 */
const batchSelectedCount = computed(
  () => lineStampStore.selectedWordIds.length + lineStampStore.customWords.length
);

/**
 * 現在選択可能な最大文言数
 * - ユーザーが選択した作成枚数（stampCount）と
 *   システム上限（MAX_LINE_STAMP_PER_REQUEST）の小さい方を最大値とする
 */
const maxSelectableCount = computed(
  () => Math.min(lineStampStore.stampCount, MAX_LINE_STAMP_PER_REQUEST)
);

/** 文言選択の上限（40件）に達しているかどうか */
const isBatchMaxReached = computed(
  () => batchSelectedCount.value >= maxSelectableCount.value
);

/**
 * 指定されたセット内の単語がすべて選択されているかどうか
 * - recommended_8 などのセット一括選択状態の判定に使用する
 */
function isSetFullySelected(set: Pick<StampSet, 'wordIds'>): boolean {
  if (set.wordIds.length === 0) return false;
  return set.wordIds.every(id => lineStampStore.selectedWordIds.includes(id));
}

/**
 * セット用チェックボックスのオン/オフに応じて
 * セット内の全単語を一括選択／解除する
 * - checked = true: セット内の未選択の単語を上限40件まで追加選択
 * - checked = false: セット内の単語のみ選択解除
 * - customWords も含めて MAX_LINE_STAMP_PER_REQUEST を超えないように制御する
 * - Phase 1 向けの代表文言（selectedWordId / customWord）も一緒に更新する
 */
function onSetCheckboxChange(set: StampSet, checked: boolean) {
  const currentSelected = lineStampStore.selectedWordIds;
  if (checked) {
    // まだ選択されていないセット内の単語を、上限に達しない範囲で追加する
    const alreadySelectedSetWordIds = new Set(currentSelected);
    const remainingSlots = Math.max(
      MAX_LINE_STAMP_PER_REQUEST - (currentSelected.length + lineStampStore.customWords.length),
      0
    );
    if (remainingSlots <= 0) {
      return;
    }

    const candidates = set.wordIds.filter(id => !alreadySelectedSetWordIds.has(id));
    const toAdd = candidates.slice(0, remainingSlots);
    const nextSelected = [...currentSelected, ...toAdd];
    lineStampStore.setSelectedWordIds(nextSelected);
  } else {
    // セット内の単語のみ選択解除する（それ以外の選択は維持）
    const nextSelected = currentSelected.filter(id => !set.wordIds.includes(id));
    lineStampStore.setSelectedWordIds(nextSelected);
  }

  // Phase 1: 単一生成用に代表となるプリセットIDを整合させる
  if (lineStampStore.selectedWordIds.length > 0) {
    // 代表IDが未設定または現在の複数選択に含まれていない場合は、先頭のIDを代表にする
    if (
      !lineStampStore.selectedWordId
      || !lineStampStore.selectedWordIds.includes(lineStampStore.selectedWordId)
    ) {
      lineStampStore.selectedWordId = lineStampStore.selectedWordIds[0] ?? null;
    }
    // プリセットを代表にした場合は、Phase 1 仕様に合わせて自由入力はクリアしておく
    lineStampStore.customWord = '';
  } else if (!lineStampStore.customWord) {
    // プリセットも自由入力も無い場合は代表IDをクリア
    lineStampStore.selectedWordId = null;
  }
}

/**
 * スタンプ枚数選択用のラジオボタンアイテム
 * label は「8枚」のような表示テキスト、value は数値のまま保持する
 * @remark NuxtUI URadioGroup の items プロパティに渡す
 */
const stampCountRadioOptions = computed(() =>
  STAMP_COUNT_OPTIONS.map(count => ({
    // ラベルは文字列型（例: "8枚"）として定義する
    label: String(count),
    value: count
  }))
);

// おすすめ8個セットとその他のセットに分離（おすすめ8個を先頭に表示）
const recommendedSet = computed(
  () => STAMP_SETS.find(s => s.id === RECOMMENDED_8_SET_ID)
);
const otherSets = computed(() =>
  STAMP_SETS.filter(s => s.id !== RECOMMENDED_8_SET_ID)
);

/** プリセットの単語が選択されているか（複数選択） */
function isWordSelected(wordId: string): boolean {
  return lineStampStore.selectedWordIds.includes(wordId);
}

/**
 * 単語チップをクリックしたときの処理（複数選択）
 * - Phase 2 の複数ワード選択に対応しつつ、Phase 1 向けに代表となる単一選択も維持する。
 * - 既に選択されている場合は解除、未選択の場合は上限40件まで追加する。
 */
function onWordClick(wordId: string) {
  const alreadySelected = lineStampStore.selectedWordIds.includes(wordId);

  // 追加選択時に上限チェック（現在の選択数が上限に達している場合は何もしない）
  if (!alreadySelected && isBatchMaxReached.value) {
    return;
  }

  // Phase 2: 複数選択用の配列をトグル更新
  lineStampStore.toggleSelectedWordId(wordId);

  // Phase 1: 単一生成用に代表となるプリセットIDも更新する
  if (!alreadySelected) {
    // 新たに選択された単語を代表として保持し、単一用の自由入力はクリアする
    lineStampStore.selectedWordId = wordId;
    lineStampStore.customWord = '';
  } else if (lineStampStore.selectedWordId === wordId) {
    // 代表としていた単語が解除された場合は、残っている中から先頭を代表にする
    const nextPrimary = lineStampStore.selectedWordIds.find(id => id !== wordId) ?? null;
    lineStampStore.selectedWordId = nextPrimary;
  }
}

/**
 * 複数自由入力用テキストエリアの値
 * - 改行区切りで customWords を編集する。
 * - 既存の Phase 1 の customWord がある場合は、初期表示時に先頭行として扱う。
 * - 合計選択数（プリセット + 自由入力）が MAX_LINE_STAMP_PER_REQUEST を超えないように制限する。
 */
const customWordsInput = computed({
  get() {
    if (lineStampStore.customWords.length > 0) {
      return lineStampStore.customWords.join('\n');
    }
    return lineStampStore.customWord;
  },
  set(value: string) {
    // 入力されたテキストを行ごとに分割し、空行を除外する
    const lines = value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.slice(0, CUSTOM_WORD_MAX_LENGTH));

    // 現在の選択可能最大数（作成するLINEスタンプ数とシステム上限の小さい方）から
    // すでに選択されているプリセット分を引いた残り枠を計算する
    const maxCustomCount = Math.max(
      maxSelectableCount.value - lineStampStore.selectedWordIds.length,
      0
    );
    const limitedLines = lines.slice(0, maxCustomCount);

    // Phase 2: 複数自由入力用の配列を更新
    lineStampStore.setCustomWords(limitedLines);

    // Phase 1: 単一生成用に代表となる自由入力も保持する（先頭行を代表とする）
    const primary = limitedLines[0] ?? '';
    lineStampStore.customWord = primary;

    // 代表の自由入力が存在する場合は、Phase 1 と同様にプリセット単一選択は解除しておく
    if (primary) {
      lineStampStore.selectedWordId = null;
    }
  }
});

// UTabs の items（単語 / セット）。初期表示は単語タブ。
const tabItems = [
  { label: '単語', value: 'words', slot: 'words' },
  { label: 'セット', value: 'sets', slot: 'sets' }
];
</script>

<template>
  <section aria-labelledby="line-stamp-preset-heading">
    <!-- 生成するスタンプ枚数の選択（Phase 2 用。現在は文言選択の上に表示してユーザーに意図を伝える） -->
    <div class="mb-4 space-y-2">
      <h2 class="text-sm font-medium text-gray-700 dark:text-gray-300">
        作成するLINEスタンプ数
      </h2>
      <URadioGroup
        v-model="lineStampStore.stampCount"
        :items="stampCountRadioOptions"
        orientation="horizontal"
      />
    </div>

    <h2
      id="line-stamp-preset-heading"
      class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      テキストを選択してください
    </h2>
    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
      選択中: {{ batchSelectedCount }} 個 / 最大 {{ maxSelectableCount }} 個
    </p>
    <UTabs
      :items="tabItems"
      color="primary"
      variant="pill"
      class="w-full"
      :unmount-on-hide="false"
      default-value="words"
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
                :disabled="!isWordSelected(word.id) && isBatchMaxReached"
                @click="onWordClick(word.id)"
              >
                {{ word.label }}
              </UButton>
            </div>
          </div>

          <!-- 自由入力（プリセット以外の文言を1件指定）。幅・高さを広めにして入力しやすくする -->
          <div class="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              自由入力
            </h3>
            <UTextarea
              v-model="customWordsInput"
              placeholder="例: おつかれさま"
              :maxlength="CUSTOM_WORD_MAX_LENGTH"
              :rows="3"
              size="md"
              class="w-full min-h-18 resize-y"
              :disabled="isBatchMaxReached"
              aria-label="スタンプに載せる文言を自由入力"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400">
              最大{{ CUSTOM_WORD_MAX_LENGTH }}文字まで
              <span v-if="isBatchMaxReached">（選択数が上限に達しているため、これ以上追加できません）</span>
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
            <div class="flex items-center gap-2">
              <UCheckbox
                :model-value="isSetFullySelected(recommendedSet)"
                :aria-label="`${recommendedSet.name}セットをまとめて選択`"
                size="sm"
                @update:model-value="
                  value => {
                    if (!recommendedSet) return;
                    onSetCheckboxChange(recommendedSet, Boolean(value));
                  }
                "
              />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ recommendedSet.name }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="wordId in recommendedSet.wordIds"
                :key="wordId"
                :variant="isWordSelected(wordId) ? 'solid' : 'outline'"
                color="primary"
                size="sm"
                class="rounded-full"
                :disabled="!isWordSelected(wordId) && isBatchMaxReached"
                @click="onWordClick(wordId)"
              >
                {{ STAMP_WORDS.find(w => w.id === wordId)?.label ?? wordId }}
              </UButton>
            </div>
          </div>

          <!-- その他のセット: 各単語をチップで単一選択可能 -->
          <div class="space-y-4">
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">
              カテゴリ別
            </h3>
            <div
              v-for="set in otherSets"
              :key="set.id"
              class="space-y-2"
            >
              <div class="flex items-center gap-2">
                <UCheckbox
                  :model-value="isSetFullySelected(set)"
                  :aria-label="`${set.name}セットをまとめて選択`"
                  size="sm"
                  @update:model-value="value => onSetCheckboxChange(set, Boolean(value))"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ set.name }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="wordId in set.wordIds"
                  :key="wordId"
                  :variant="isWordSelected(wordId) ? 'solid' : 'outline'"
                  color="primary"
                  size="sm"
                  class="rounded-full"
                  :disabled="!isWordSelected(wordId) && isBatchMaxReached"
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
