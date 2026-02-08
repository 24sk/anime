# Nuxt UI コンポーネント対応表

[← 画面一覧に戻る](../ui-features.md)

---

## 機能別使用コンポーネント一覧

| 機能 | 使用予定の Nuxt UI コンポーネント | 用途 |
| ---- | -------------------------------- | ---- |
| **全体構造** | `UApp`、`UContainer`、`UCard` | アプリ全体のラッパー、コンテンツの中央配置、カードレイアウト |
| **レイアウト** | `UHeader`、`UMain`、`UFooter` | ヘッダー、メインコンテンツ、フッター |
| **ボタン類** | `UButton`、`UButtonGroup` | 生成ボタン、アクションボタン、ボタングループ |
| **入力/選択** | `UFileUpload`、`UTextarea`、`URadioGroup`、`UToggle`、`UCheckbox` | ファイルアップロード、フリーテキスト入力、スタイル選択、SNSシミュレーター切り替え、LINEスタンプのメイン・タブ画像オプション |
| **進行状況** | `UProgress` | 生成進捗の表示 |
| **通知/ガイド** | `UNotifications`、nuxt-driver.js（`useDriver()`）、`UTooltip` | トースト通知、使い方ガイド（要素ハイライトツアー）、ツールチップ |
| **アイコン** | `UIcon` (Iconify 連携) | 各種アイコン表示（@iconify-json/lucide を使用） |
| **画像** | `NuxtImg` (via @nuxt/image) | 画像の最適化と表示 |
| **アスペクト比** | Tailwind `aspect-square` | 画像の 1:1 アスペクト比維持 |
| **カラーモード** | `UColorModeButton` | ダークモード切り替え |
| **LINEスタンプ作成** | `UButton`、`UCard`、`UCheckbox`、`NuxtImg`、`NuxtLink` | 入口ボタン、文言チップ/カード、オプション、元画像プレビュー、戻るリンク。画像合成は Canvas、ZIP は JSZip |

## コンポーネント詳細

### レイアウト系

- **UApp**: アプリ全体のラッパーコンポーネント
- **UContainer**: コンテンツの最大幅を制限し、中央配置
- **UHeader**: レスポンシブなヘッダーコンポーネント
- **UMain**: メインコンテンツエリア
- **UCard**: カード形式のコンテンツ表示

### フォーム系

- **UFileUpload**: ファイルアップロード用のコンポーネント（ドラッグ&ドロップ対応、プレビュー機能付き）
- **UTextarea**: フリーテキスト入力用の複数行テキストエリア
- **URadioGroup**: スタイル選択用のラジオボタングループ
- **UToggle**: SNSシミュレーターの円形マスク切り替え

### ボタン系

- **UButton**: 各種アクションボタン（生成、ダウンロード、シェア、リトライ）
- **UButtonGroup**: 複数のボタンをグループ化

### 表示系

- **UProgress**: 生成進捗のプログレスバー
- **UIcon**: Iconify 連携によるアイコン表示
- **Tailwind aspect-square**: 画像の 1:1 アスペクト比を維持（CSS aspect-ratio）
- **NuxtImg**: 画像の最適化と遅延読み込み

### 通知系

- **UNotifications**: トースト通知の表示
- **nuxt-driver.js（useDriver）**: 使い方ガイド。画面上の要素を順にハイライトし、ポップオーバーで操作手順を案内するインタラクティブツアー
- **UTooltip**: ツールチップ表示

### カラーモード系

- **UColorModeButton**: ダークモード切り替えボタン
