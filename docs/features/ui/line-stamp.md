# LINEスタンプ作成機能

変換済みアイコンに文言を重ね、LINE申請用画像（370×320 等）を生成し ZIP でダウンロードする機能。

- **仕様書**: [line-stamp-spec.md](../requirements/line-stamp-spec.md)
- **結果画面からの入口**: [結果・プレビュー画面](result.md) のアクションボタン領域に「LINEスタンプ用に作る」ボタンを追加

[← 画面一覧に戻る](../ui-features.md)

---

## 実装タスク一覧

- [x] **結果画面への入口**
  - 結果画面（`/result`）のアクションボタン領域に「LINEスタンプ用に作る」ボタンを 1 つ追加
  - 配置: 「保存」「Post」の下、または「もう一度作る」の上/下。既存の `UButton`・`rounded-3xl` 等に合わせる
  - クリックで `/result/line-stamp` へ遷移（`NuxtLink` または `navigateTo`）
- [x] **LINEスタンプ作成ページの新設**
  - ルート: `/result/line-stamp`。レイアウトはモバイルファースト 1 カラム、既存の `max-w-md` 等に合わせる
  - ヘッダー: タイトル「LINEスタンプ用に書き出し」（戻るボタンはなし）
  - 元画像なし（`resultImageUrl` 未設定）で直接アクセスされた場合は結果画面へリダイレクト
- [x] **プリセットデータ・型定義**
  - `StampWord`（id, label, group）・`StampSet`（id, name, wordIds, type）・`StampCategory`（id, name, setIds）の型定義
  - 単語プリセット定数: あいさつ・感謝・リアクション・応援・愛情・ごめん・フォロー（仕様 3.2.1 の初期実装分）
  - セット定数: あいさつ・感謝・リアクション・愛情・フォロー・応援、および **おすすめ8個（申請用）**（仕様 3.2.2）
  - おすすめ8個セットは UI で目立つ位置に配置
- [x] **文言選択 UI**
  - 単語／セット（および必要に応じてカテゴリ）のタブまたは切り替え
  - プリセットをチップまたはカードで表示し、複数選択可能。セット選択で複数単語を一括選択
  - 推奨「8個セット」を目立たせ、1 クリックで申請最小構成を選択できるようにする
- [ ] **プレビュー表示**
  - 選択した文言を重ねたスタンプ画像のプレビュー（グリッドまたは横スクロール）
  - 選択解除時は該当プレビューを削除。ページ専用コンポーネント例: `StampPreviewGrid.vue`
- [ ] **画像合成（Canvas）**
  - クライアントで Canvas を使用し、元画像＋テキストを描画
  - LINE 仕様: スタンプ 370×320 以内（または 240×240）、1 枚ずつ Blob 化
  - フォント: Noto Sans JP 等、利用許諾を確認した Web フォント。読み込み完了後に描画
  - 別オリジン（Vercel Blob）の画像は CORS 対応（`crossOrigin` または API 経由取得）
  - 同時生成枚数上限（例: 40 枚）を設ける
- [ ] **ZIP ダウンロード**
  - JSZip でスタンプ画像を `01.png`, `02.png` … のファイル名で ZIP にまとめ、一括ダウンロード
  - 主 CTA: 「ZIPでダウンロード」。ZIP 生成中はローディング表示
- [ ] **メイン・タブ画像オプション**
  - チェックボックス「メイン画像・タブ画像もZIPに含める（LINE申請用）」
  - メイン: 240×240、`main.png`。タブ: 96×74、`tab.png`。ZIP に含める
- [x] **ストア・状態**
  - 選択中の wordIds・ZIP 生成中フラグ等を `useLineStampStore` で分離（`app/stores/line-stamp.ts`）
- [x] **コンポーネント配置（文言選択）**
  - ページ専用: `components/pages/line-stamp/StampPresetSelector.vue` を配置
  - 共通コンポーネントは既存 `common/` を流用し、新規は必要最小限
- [ ] **申請注記・FAQ（A + C 確定）**
  - LINEスタンプ作成ページ（`/result/line-stamp`）に「LINEクリエイターズマーケットへの申請はご自身でお願いします」を表示（ヘッダー直下 or CTA 上）。必要に応じて LINE Creators Market へのリンクを併記 → **注記は実装済み**
  - FAQ（`/faq`）に「LINEスタンプの申請はどこでしますか？」を追加し、申請はユーザー自身が LINE Creators Market で行う旨とリンクで案内

※ カテゴリ表示（セットのグループ化）・仕事用・季節プリセットは Phase 2 で追加予定。

---

## 5.1 結果画面の変更（入口）

- [x] **「LINEスタンプ用に作る」ボタン**
  - アクションボタン領域に 1 つ追加。配置は「保存」「Post」の下、または「もう一度作る」の上/下
  - `UButton` を使用し、既存の `result.vue` のスタイル（`rounded-3xl` 等）に合わせる
  - クリックで `/result/line-stamp` へ遷移

## 5.2 LINEスタンプ作成ページ（`/result/line-stamp`）

- [x] **ページ骨格・ガード**
  - ルート: `/result/line-stamp`。モバイルファースト 1 カラム、`max-w-md` 等で最大幅を既存に合わせる
  - ヘッダー: タイトル「LINEスタンプ用に書き出し」（戻るボタンはなし）
  - `generationStore.resultImageUrl` が無い場合は結果画面へリダイレクト
- [x] **申請注記の表示**（5.6 確定仕様）
  - ヘッダー直下、または「ZIPでダウンロード」の上に「LINEクリエイターズマーケットへの申請はご自身でお願いします」を1行で表示
  - 必要に応じて LINE Creators Market（https://creator.line.me/ja/）への外部リンクを併記（`<a target="_blank" rel="noopener noreferrer">`）
- [x] **元画像エリア**
  - 完成したアイコン画像のプレビュー（小さめのサムネイル）。`resultImageUrl` を `NuxtImg` で表示
- [x] **文言選択ブロック**
  - 単語／セットのタブまたは切り替え。カテゴリは Phase 2 でも可
  - **おすすめ8個（申請用）** を目立つ位置に配置し、1 クリックで選択可能に
  - プリセットをチップまたはカードで表示、複数選択可能。使用例: `UButton`（チップ風）、`UCard`（カード）
  - ページ専用コンポーネント: `components/pages/line-stamp/StampPresetSelector.vue`
- [ ] **プレビューブロック**
  - 選択した文言を重ねたスタンプ画像のプレビュー（グリッドまたは横スクロール）
  - 選択解除時は該当プレビューを削除。コンポーネント例: `StampPreviewGrid.vue`
- [ ] **オプション**
  - チェックボックス「メイン画像・タブ画像もZIPに含める（LINE申請用）」（`UCheckbox`）
- [ ] **ダウンロード**
  - 主 CTA: 「ZIPでダウンロード」（`UButton`）。ZIP 生成中は `loading` 表示

## 5.3 データ・定数・ストア

- [x] **型定義**
  - `StampWordGroup`（aisatsu, kansha, reaction, oen, ai_follow, gomen_follow 等）
  - `StampWord`（id, label, group）、`StampSet`（id, name, wordIds, type?）、`StampCategory`（id, name, setIds）
  - `StampSetType`: `'required' | 'recommended_8' | 'extended'`
- [x] **単語プリセット定数**
  - 仕様 3.2.1 に基づく単語一覧（あいさつ・感謝・リアクション・応援・愛情・ごめん・フォロー）。初期実装では仕事用・季節は Phase 2
- [x] **セット・カテゴリ定数**
  - 必須セット: あいさつ・感謝・リアクション・愛情・フォロー・応援
  - 推奨8個セット: `recommended_8`（ohayo, oyasumi, arigato, otsukare, iine, daisuki, gomen, bye）
  - カテゴリは「セットのグループ表示」またはタブで対応。Phase 2 で拡張可
- [x] **ストア**
  - 選択中 wordIds・ZIP 生成中フラグ等を `useLineStampStore` で分離（`app/stores/line-stamp.ts`）

## 5.4 画像合成・出力

- [ ] **Canvas 描画**
  - 元画像を `drawImage` で描画し、テキストを重ねてから LINE 仕様サイズ（370×320 以内または 240×240）にリサイズして Blob 化
  - フォント: Noto Sans JP 等。Web フォント読み込み完了後に描画
  - 別オリジン画像の CORS 対応（`crossOrigin` 設定または API 経由で Blob 取得）
  - 同時生成枚数上限（例: 40 枚）を設ける
- [ ] **ZIP 生成**
  - JSZip でスタンプ画像を `01.png`, `02.png` … で ZIP に追加。メイン画像 `main.png`（240×240）、タブ画像 `tab.png`（96×74）はオプションで含める
  - 一括ダウンロードで ZIP をダウンロード

## 5.5 実装順序の目安

1. 結果画面に「LINEスタンプ用に作る」ボタンと `/result/line-stamp` 遷移
2. LINEスタンプ作成ページ新設・元画像表示・未設定時リダイレクト
3. 単語プリセット定数と単語選択 UI（チップ/カード）
4. Canvas で画像＋テキスト描画・リサイズ・Blob 化
5. 複数枚を ZIP にまとめてダウンロード（01.png, 02.png …）
6. セット定義とセット選択で一括選択
7. メイン・タブ画像オプションと ZIP への main.png / tab.png 追加
8. カテゴリ表示は Phase 2

## 5.6 注記「LINEクリエイターズマーケットへの申請はご自身で」の記載場所（確定：A + C）

**採用:** **A + C** で確定。

- **A（LINEスタンプ作成ページ）**  
  「LINEクリエイターズマーケットへの申請はご自身でお願いします」を、`/result/line-stamp` に必ず1回表示する。表示位置はヘッダー直下、または「ZIPでダウンロード」ボタンの上。必要に応じて [LINE Creators Market](https://creator.line.me/ja/) への外部リンク（`target="_blank"` `rel="noopener noreferrer"`）を併記する。
- **C（FAQ）**  
  FAQ に「LINEスタンプの申請はどこでしますか？」を追加する。回答で、申請・審査・販売はユーザー自身が LINE Creators Market で行う旨を記載し、LINE Creators Market のリンクで案内する。

実装タスク: 5.2 に「申請注記の表示」、静的ページ（FAQ）に「LINEスタンプ申請のFAQ項目」を反映済み。

## 5.7 注意事項

- 申請・審査・販売はユーザーが LINE Creators Market で実施。本機能は「スタンプ用画像の準備」まで。申請手順はヘルプまたはリンクで案内
- 既存 UI の変更は結果画面のボタン追加のみ。レイアウト・色・フォント・余白は変更しない（`ui-ux.mdc` 準拠）
- フォントの利用許諾を満たすこと
