/**
 * LINEスタンプ作成ページ用の状態を管理するストア
 * - 選択中の文言はプリセット1件または自由入力1件のいずれか（単一選択）
 *   - Phase 2 では複数プリセット・複数自由入力を扱うための state も併用する
 * - 生成するスタンプ枚数（Phase 2 の複数生成で使用）
 * - ZIP生成中フラグ（後続タスクで使用）
 * @remark 仕様: docs/features/ui/line-stamp.md 5.3 ストア, 5.8.1 仕様・制約
 */

import { STAMP_WORDS } from '~~/shared/constants/line-stamp';

/**
 * 再試行の上限回数
 * - 失敗した文言・メイン画像・タブ画像に対して自動再生成を試みる最大回数
 * - ここでの「再試行回数」は、最初の試行を除いた「やり直し回数」を指す
 *   - 例: 2 の場合 → 初回 + 最大2回の再生成（合計3回まで）
 */
const MAX_RETRY_COUNT = 2;

/**
 * Phase 2 の複数スタンプ生成時に使用するステータス
 * - idle: まだ生成処理を行っていない初期状態
 * - generating: 生成処理中
 * - success: 正常に生成が完了した状態
 * - failed: エラーなどで生成に失敗した状態
 */
type LineStampItemStatus = 'idle' | 'generating' | 'success' | 'failed';

/**
 * 各文言ごとの生成結果を管理するための型
 * - status: 生成状態（成功 / 失敗 / 実行中 など）
 * - retryCount: 当該文言に対して再試行した回数
 * - imageUrl: 生成に成功した場合のスタンプ画像 URL
 * - errorMessage: 失敗時のユーザー向けエラーメッセージ
 */
interface LineStampTextResult {
  status: LineStampItemStatus;
  retryCount: number;
  imageUrl: string | null;
  errorMessage: string | null;
}

/**
 * メイン画像・タブ画像の生成状態を管理するための型
 * - status: 生成状態（成功 / 失敗 / 実行中 など）
 * - retryCount: 生成を試行した回数
 * - imageUrl: 生成に成功した場合の画像 URL
 * - errorMessage: 失敗時のユーザー向けエラーメッセージ
 */
interface LineStampImageResult {
  status: LineStampItemStatus;
  retryCount: number;
  imageUrl: string | null;
  errorMessage: string | null;
}

/**
 * ZIP ダウンロード用の状態を管理するための型
 * - status: ZIP の生成・署名付き URL 取得の状態
 * - retryCount: ZIP 生成を試行した回数
 * - downloadUrl: 生成された ZIP の署名付きダウンロード URL
 * - errorMessage: 失敗時のユーザー向けエラーメッセージ
 */
interface LineStampZipResult {
  status: LineStampItemStatus;
  retryCount: number;
  downloadUrl: string | null;
  errorMessage: string | null;
}

/**
 * メイン画像・タブ画像用の初期状態を生成するヘルパー
 */
function createInitialImageResult(): LineStampImageResult {
  return {
    status: 'idle',
    retryCount: 0,
    imageUrl: null,
    errorMessage: null
  };
}

/**
 * ZIP ダウンロード用の初期状態を生成するヘルパー
 */
function createInitialZipResult(): LineStampZipResult {
  return {
    status: 'idle',
    retryCount: 0,
    downloadUrl: null,
    errorMessage: null
  };
}

export const useLineStampStore = defineStore('line-stamp', {
  state: () => ({
    /** 選択中のプリセット単語ID（null の場合は自由入力を使用） */
    selectedWordId: null as string | null,
    /** 自由入力の文言（プリセット未選択時に使用。API・プレビューではこちらを優先） */
    customWord: '',
    /**
     * Phase 2: 複数スタンプ生成時に選択されているプリセット単語ID一覧
     * - 複数ワード選択 UI（チップ・セット一括選択）と連動する
     * - Phase 1 との互換性のため、単一選択用 selectedWordId とは別に保持する
     */
    selectedWordIds: [] as string[],
    /**
     * Phase 2: 複数スタンプ生成時の自由入力文言一覧
     * - UI では複数行入力や追加ボタンなどで管理する想定
     * - 空文字や空白のみの要素は actions 側で取り除く
     */
    customWords: [] as string[],
    /**
     * Phase 2: ZIP ダウンロード時にメイン画像・タブ画像を同梱するかどうか
     * - 仕様上は「常にメイン画像・タブ画像を含める」前提のため、初期値は true
     * - 将来的にオプション化する場合に備えて boolean で管理する
     */
    includeMainAndTab: true,
    /** AI でスタンプ 1 枚生成中かどうか */
    isGeneratingStamp: false,
    /** 生成完了後のスタンプ画像 URL（1 枚）。未生成・エラー時は null */
    generatedStampImageUrl: null as string | null,
    /** 生成失敗時のユーザー向けエラーメッセージ。未発生時は null */
    generateError: null as string | null,
    /**
     * 複数スタンプ生成時の目標枚数
     * 8 / 16 / 24 / 32 / 40 のいずれかを UI から選択し、初期値は 8
     */
    stampCount: 8 as 8 | 16 | 24 | 32 | 40,
    /** ZIP生成中かどうか（後続タスクで使用） */
    isGeneratingZip: false,
    /**
     * Phase 2: 各文言ごとの生成結果を管理するマップ
     * - キー: 文言を一意に識別するキー（プリセットIDやラベル文字列など）
     * - 値: 生成状態・再試行回数・画像URL・エラーメッセージ
     * @remark 仕様: docs/features/ui/line-stamp.md 5.8.1 / 2. ストア・状態管理
     */
    textResults: {} as Record<string, LineStampTextResult>,
    /**
     * Phase 2: メイン画像（一覧サムネイル用など）の生成状態
     * - 同一バッチ内で 1 枚のみ生成される前提
     */
    mainImageResult: createInitialImageResult(),
    /**
     * Phase 2: タブ画像（トークルームタブ用など）の生成状態
     * - 同一バッチ内で 1 枚のみ生成される前提
     */
    tabImageResult: createInitialImageResult(),
    /**
     * Phase 2: ZIP ダウンロード用ファイルの生成状態
     * - 生成が完了すると downloadUrl に署名付き URL が入る想定
     */
    zipResult: createInitialZipResult()
  }),

  getters: {
    /** 選択中のプリセット単語IDの Set（含まれるか判定用・単一選択のため0または1） */
    selectedWordIdSet(state): Set<string> {
      return state.selectedWordId ? new Set([state.selectedWordId]) : new Set();
    },

    /**
     * 実際に使用する文言（API・プレビュー用）
     * 自由入力が空でなければその値、否则は選択中プリセットの label
     */
    effectiveLabel(state): string {
      const trimmed = state.customWord.trim();
      if (trimmed) return trimmed;
      if (!state.selectedWordId) return '';
      const word = STAMP_WORDS.find(w => w.id === state.selectedWordId);
      return word?.label ?? '';
    },

    /** 文言が1件選択されているか（プリセットまたは自由入力） */
    hasSelection(state): boolean {
      if (state.customWord.trim()) return true;
      return state.selectedWordId !== null;
    },

    /**
     * Phase 2: バッチ生成で使用する文言一覧
     * - 複数選択されたプリセット単語IDを label に変換
     * - 複数自由入力（customWords）のうち空でないものを採用
     * - 重複する文言は Set で除外し、最大数の制限は UI / API 側で別途行う
     */
    effectiveLabelsForBatch(state): string[] {
      const labelsFromPreset = state.selectedWordIds
        .map(id => STAMP_WORDS.find(w => w.id === id)?.label)
        .filter((label): label is string => !!label);

      const labelsFromCustom = state.customWords
        .map(text => text.trim())
        .filter(text => text.length > 0);

      return Array.from(new Set([...labelsFromPreset, ...labelsFromCustom]));
    },

    /**
     * Phase 2: バッチ生成用に有効な文言が1件以上選択されているか
     */
    hasBatchSelection(): boolean {
      return this.effectiveLabelsForBatch.length > 0;
    },

    /**
     * Phase 2: 失敗した文言のうち、再試行上限に達していないキー一覧
     * - 「失敗分を再生成」ボタンなどの UI で使用する想定
     * - retryCount が MAX_RETRY_COUNT 以上のものは「最終的に失敗」とみなし、自動再生成対象から除外する
     */
    retryableTextKeys(state): string[] {
      return Object.entries(state.textResults)
        .filter(
          ([, result]) =>
            result.status === 'failed' && result.retryCount < MAX_RETRY_COUNT
        )
        .map(([key]) => key);
    },

    /**
     * Phase 2: 再試行可能な文言が1件以上存在するか
     * - すべての失敗文言が上限に達している場合は false になり、
     *   UI 上で「失敗分を再生成」ボタンを非活性にするなどの制御に利用できる
     */
    hasRetryableTexts(): boolean {
      return this.retryableTextKeys.length > 0;
    },

    /**
     * Phase 2: メイン画像が再試行可能かどうか
     * - status が failed かつ retryCount が上限未満の場合のみ true
     */
    canRetryMainImage(state): boolean {
      return (
        state.mainImageResult.status === 'failed'
        && state.mainImageResult.retryCount < MAX_RETRY_COUNT
      );
    },

    /**
     * Phase 2: タブ画像が再試行可能かどうか
     * - status が failed かつ retryCount が上限未満の場合のみ true
     */
    canRetryTabImage(state): boolean {
      return (
        state.tabImageResult.status === 'failed'
        && state.tabImageResult.retryCount < MAX_RETRY_COUNT
      );
    }
  },

  actions: {
    /**
     * プリセット単語を1件選択する（自由入力をクリアする）
     * @param wordId - 単語ID（例: ohayo）。null の場合はプリセット選択を解除
     */
    setSelectedWordId(wordId: string | null) {
      this.selectedWordId = wordId;
      this.customWord = '';
    },

    /**
     * 自由入力の文言を設定する（プリセット選択を解除する）
     * @param text - ユーザーが入力した文言
     */
    setCustomWord(text: string) {
      this.customWord = text;
      this.selectedWordId = null;
    },

    /**
     * Phase 2: 複数プリセット単語の選択全体を置き換える
     * @param wordIds - 選択する単語IDの配列
     */
    setSelectedWordIds(wordIds: string[]) {
      // 空文字や重複を排除してから state に反映する
      const normalized = wordIds
        .map(id => id.trim())
        .filter(id => id.length > 0);
      this.selectedWordIds = Array.from(new Set(normalized));
    },

    /**
     * Phase 2: 単一のプリセット単語の選択状態をトグルする
     * - 既に含まれていれば解除、含まれていなければ追加
     * @param wordId - 単語ID
     */
    toggleSelectedWordId(wordId: string) {
      const trimmed = wordId.trim();
      if (!trimmed) return;
      if (this.selectedWordIds.includes(trimmed)) {
        this.selectedWordIds = this.selectedWordIds.filter(id => id !== trimmed);
      } else {
        this.selectedWordIds = [...this.selectedWordIds, trimmed];
      }
    },

    /**
     * Phase 2: 複数自由入力文言の一覧を一括設定する
     * @param words - 自由入力文言の配列
     */
    setCustomWords(words: string[]) {
      this.customWords = words
        .map(text => text.trim())
        .filter(text => text.length > 0);
    },

    /**
     * Phase 2: 自由入力文言を1件追加する
     * @param text - 追加する文言
     */
    addCustomWord(text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      this.customWords = [...this.customWords, trimmed];
    },

    /**
     * Phase 2: 指定インデックスの自由入力文言を更新する
     * @param index - 更新対象インデックス
     * @param text - 新しい文言
     */
    updateCustomWord(index: number, text: string) {
      if (index < 0 || index >= this.customWords.length) return;
      const trimmed = text.trim();
      if (!trimmed) {
        // 空になった場合は削除扱い
        this.customWords = this.customWords.filter((_, i) => i !== index);
        return;
      }
      this.customWords = this.customWords.map((word, i) => (i === index ? trimmed : word));
    },

    /**
     * Phase 2: 指定インデックスの自由入力文言を削除する
     * @param index - 削除対象インデックス
     */
    removeCustomWord(index: number) {
      if (index < 0 || index >= this.customWords.length) return;
      this.customWords = this.customWords.filter((_, i) => i !== index);
    },

    /**
     * Phase 2: メイン画像・タブ画像をZIPに含めるかどうかを設定する
     * @param value - true の場合は同梱する
     */
    setIncludeMainAndTab(value: boolean) {
      this.includeMainAndTab = value;
    },

    /** 選択をすべて解除する */
    clearSelection() {
      this.selectedWordId = null;
      this.customWord = '';
      this.selectedWordIds = [];
      this.customWords = [];
    },

    /** ZIP生成中フラグを設定（後続タスクで使用） */
    setIsGeneratingZip(value: boolean) {
      this.isGeneratingZip = value;
    },

    /**
     * 生成するスタンプ枚数を設定する
     * @param count - 8 / 16 / 24 / 32 / 40 のいずれか
     */
    setStampCount(count: 8 | 16 | 24 | 32 | 40) {
      this.stampCount = count;
    },

    /**
     * Phase 2: バッチ生成開始時に、対象となる文言とメイン画像・タブ画像・ZIP の状態を初期化する
     * - textKeys に含まれるキーごとに LineStampTextResult を生成 or 更新し、status を generating にする
     * - メイン画像・タブ画像は status を generating にし、URL・エラーをクリアする
     * - ZIP はまだ生成を開始しないため idle に戻し、URL・エラー・再試行回数をクリアする
     * @param textKeys - 生成対象となる文言を一意に識別するキー配列
     */
    startBatchGeneration(textKeys: string[]) {
      const nextResults: Record<string, LineStampTextResult> = {};

      for (const rawKey of textKeys) {
        const key = rawKey.trim();
        if (!key) continue;

        const existing = this.textResults[key];
        nextResults[key] = {
          status: 'generating',
          // 初回開始時は 0、再実行時は既存の retryCount を引き継ぐ
          retryCount: existing?.retryCount ?? 0,
          // 再実行時も前回成功した画像は保持しておき、UI 側で必要に応じて利用できるようにする
          imageUrl: existing?.imageUrl ?? null,
          errorMessage: null
        };
      }

      this.textResults = nextResults;

      // メイン画像・タブ画像は同一バッチに紐づくため、開始時点で generating にする
      this.mainImageResult = {
        ...this.mainImageResult,
        status: 'generating',
        errorMessage: null
      };
      this.tabImageResult = {
        ...this.tabImageResult,
        status: 'generating',
        errorMessage: null
      };

      // ZIP はまだ生成しないため idle に戻しておく
      this.zipResult = createInitialZipResult();
    },

    /**
     * Phase 2: 個々の文言の生成成功を反映する
     * - 対象キーが存在しない場合は新規にエントリを作成する
     * @param key - 文言を一意に識別するキー
     * @param imageUrl - 生成されたスタンプ画像の URL
     */
    setTextGenerationSuccess(key: string, imageUrl: string) {
      const trimmed = key.trim();
      if (!trimmed) return;

      const existing = this.textResults[trimmed] ?? {
        status: 'idle',
        retryCount: 0,
        imageUrl: null,
        errorMessage: null
      };

      this.textResults[trimmed] = {
        ...existing,
        status: 'success',
        imageUrl,
        errorMessage: null
      };
    },

    /**
     * Phase 2: 個々の文言の生成失敗を反映する
     * - 既存の retryCount は保持し、UI 側で「何回失敗したか」を表示できるようにする
     * @param key - 文言を一意に識別するキー
     * @param errorMessage - ユーザー向けエラーメッセージ
     */
    setTextGenerationFailure(key: string, errorMessage: string) {
      const trimmed = key.trim();
      if (!trimmed) return;

      const existing = this.textResults[trimmed] ?? {
        status: 'idle',
        retryCount: 0,
        imageUrl: null,
        errorMessage: null
      };

      this.textResults[trimmed] = {
        ...existing,
        status: 'failed',
        errorMessage
      };
    },

    /**
     * Phase 2: 失敗した文言のみを再生成対象として再度 generating 状態にする
     * - retryCount を 1 増加させ、エラーメッセージをクリアする
     * - API 呼び出し側でどの文言を再送するか判断できるよう、対象キー一覧を返す
     * @returns 再生成対象となる文言キーの配列
     */
    retryFailedTexts(): string[] {
      const retryKeys: string[] = [];

      Object.entries(this.textResults).forEach(([key, result]) => {
        // 失敗状態かつ再試行上限未満のみ自動再生成の対象とする
        if (result.status !== 'failed') return;
        if (result.retryCount >= MAX_RETRY_COUNT) return;

        const nextRetryCount = result.retryCount + 1;

        this.textResults[key] = {
          ...result,
          status: 'generating',
          retryCount: nextRetryCount,
          errorMessage: null
        };

        retryKeys.push(key);
      });

      return retryKeys;
    },

    /**
     * Phase 2: メイン画像生成の開始を記録する
     * - status を generating にし、エラーメッセージをクリアする
     * - retryCount はそのまま維持し、再試行回数をトラッキングできるようにする
     */
    startMainImageGeneration() {
      // 再試行上限に達している場合はそれ以上の自動再生成を行わない
      if (this.mainImageResult.retryCount >= MAX_RETRY_COUNT) {
        return;
      }

      this.mainImageResult = {
        ...this.mainImageResult,
        status: 'generating',
        // メイン画像の retryCount は「試行回数」として扱うため、開始ごとにインクリメントする
        retryCount: this.mainImageResult.retryCount + 1,
        errorMessage: null
      };
    },

    /**
     * Phase 2: メイン画像生成の成功を記録する
     * @param imageUrl - 生成されたメイン画像の URL
     */
    setMainImageSuccess(imageUrl: string) {
      this.mainImageResult = {
        ...this.mainImageResult,
        status: 'success',
        imageUrl,
        errorMessage: null
      };
    },

    /**
     * Phase 2: メイン画像生成の失敗を記録する
     * @param errorMessage - ユーザー向けエラーメッセージ
     */
    setMainImageFailure(errorMessage: string) {
      this.mainImageResult = {
        ...this.mainImageResult,
        status: 'failed',
        errorMessage
      };
    },

    /**
     * Phase 2: タブ画像生成の開始を記録する
     */
    startTabImageGeneration() {
      // 再試行上限に達している場合はそれ以上の自動再生成を行わない
      if (this.tabImageResult.retryCount >= MAX_RETRY_COUNT) {
        return;
      }

      this.tabImageResult = {
        ...this.tabImageResult,
        status: 'generating',
        // タブ画像の retryCount も「試行回数」として扱う
        retryCount: this.tabImageResult.retryCount + 1,
        errorMessage: null
      };
    },

    /**
     * Phase 2: タブ画像生成の成功を記録する
     * @param imageUrl - 生成されたタブ画像の URL
     */
    setTabImageSuccess(imageUrl: string) {
      this.tabImageResult = {
        ...this.tabImageResult,
        status: 'success',
        imageUrl,
        errorMessage: null
      };
    },

    /**
     * Phase 2: タブ画像生成の失敗を記録する
     * @param errorMessage - ユーザー向けエラーメッセージ
     */
    setTabImageFailure(errorMessage: string) {
      this.tabImageResult = {
        ...this.tabImageResult,
        status: 'failed',
        errorMessage
      };
    },

    /**
     * Phase 2: ZIP 生成処理の開始を記録する
     * - 生成開始時に retryCount をインクリメントし、URL・エラーメッセージをクリアする
     */
    startZipGeneration() {
      this.zipResult = {
        status: 'generating',
        retryCount: this.zipResult.retryCount + 1,
        downloadUrl: null,
        errorMessage: null
      };
    },

    /**
     * Phase 2: ZIP 生成処理の成功を記録する
     * @param downloadUrl - 生成された ZIP の署名付きダウンロード URL
     */
    setZipGenerationSuccess(downloadUrl: string) {
      this.zipResult = {
        ...this.zipResult,
        status: 'success',
        downloadUrl,
        errorMessage: null
      };
    },

    /**
     * Phase 2: ZIP 生成処理の失敗を記録する
     * @param errorMessage - ユーザー向けエラーメッセージ
     */
    setZipGenerationFailure(errorMessage: string) {
      this.zipResult = {
        ...this.zipResult,
        status: 'failed',
        errorMessage
      };
    },

    /**
     * Phase 2: バッチ生成まわりの状態をすべてリセットする
     * - 各文言の結果・メイン画像・タブ画像・ZIP の状態を初期化する
     * - ページ離脱時や新しいジョブの開始前に呼び出す想定
     */
    resetBatchGenerationState() {
      this.textResults = {};
      this.mainImageResult = createInitialImageResult();
      this.tabImageResult = createInitialImageResult();
      this.zipResult = createInitialZipResult();
    },

    /** AI スタンプ生成開始（ローディング状態にし、前回の結果・エラーをクリア） */
    startGeneratingStamp() {
      this.isGeneratingStamp = true;
      this.generatedStampImageUrl = null;
      this.generateError = null;
    },

    /** AI スタンプ生成成功（結果 URL を保存） */
    setGeneratedStampImageUrl(url: string) {
      this.isGeneratingStamp = false;
      this.generatedStampImageUrl = url;
      this.generateError = null;
    },

    /** AI スタンプ生成失敗（ユーザー向けメッセージを保存） */
    setGenerateError(message: string) {
      this.isGeneratingStamp = false;
      this.generatedStampImageUrl = null;
      this.generateError = message;
    },

    /** ストアをリセット（ページ離脱時など） */
    reset() {
      this.selectedWordId = null;
      this.customWord = '';
      this.selectedWordIds = [];
      this.customWords = [];
      this.includeMainAndTab = true;
      this.isGeneratingStamp = false;
      this.generatedStampImageUrl = null;
      this.generateError = null;
      this.isGeneratingZip = false;
      this.textResults = {};
      this.mainImageResult = createInitialImageResult();
      this.tabImageResult = createInitialImageResult();
      this.zipResult = createInitialZipResult();
    }
  }
});
