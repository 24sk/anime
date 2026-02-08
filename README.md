# AniMe（アニミー）

**「うちの子」を世界に一つだけのデジタルアートへ。**

ペット（犬・猫など）の写真をアップロードすると、AIがおしゃれなイラスト風アイコンに変換するWebアプリケーションです。

## 主な機能

- **ペット特化の Image-to-Image 生成** … 構図・毛色・表情を活かしたアイコン化
- **スタイルプリセット** … 3Dアニメ、水彩画、ゆるふわ、サイバーパンク、韓国風、シンプルイラストから選択
- **フリーテキスト** … 「リボンをつけて」など追加の要望を日本語で入力可能
- **広告表示・ダウンロード制御** … 生成待ち時間中の広告表示後、視聴完了でダウンロード可能に
- **SNSアイコンプレビュー** … 円形マスクで X / Instagram 風の見え方をシミュレート

## 技術スタック

| レイヤー       | 技術            |
|----------------|-----------------|
| フロントエンド | Nuxt 4, NuxtUI  |
| 状態管理       | Pinia           |
| BaaS / DB      | Supabase        |
| バックエンド   | Nitro (Nuxt 4)  |
| 画像生成API    | Gemini (Imagen 3) |
| ストレージ     | Vercel Blob     |
| ホスティング   | Vercel          |

## 必要環境

- Node.js（`.node-version` に記載のバージョン）
- pnpm

## セットアップ

### 1. リポジトリのクローンと依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を設定してください。

```bash
cp .env.example .env
```

| 変数名 | 説明 |
|--------|------|
| `SUPABASE_URL` | Supabase プロジェクトURL |
| `SUPABASE_KEY` | レガシー Anon キー |
| `NUXT_PUBLIC_SUPABASE_URL` | 公開用 Supabase URL |
| `NUXT_SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー（サーバー側のみ） |
| `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 公開可能キー |
| `NUXT_GEMINI_API_KEY` | Gemini API キー |
| `NUXT_BLOB_READ_WRITE_TOKEN` | Vercel Blob トークン |
| `NUXT_PUBLIC_APP_URL` | アプリの公開URL（例: `http://localhost:3000`） |

### 3. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで <http://localhost:3000> を開いてください。

## 開発用コマンド

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | 本番ビルド |
| `pnpm preview` | ビルド後のプレビュー |
| `pnpm typecheck` | 型チェック |
| `pnpm lint` | ESLint 実行 |

## プロジェクト構成（抜粋）

```
app/
├── components/     # 共通・ページ用コンポーネント
├── composables/    # コンポーザブル（セッション、Supabase 等）
├── pages/          # ページ（トップ、生成中、結果、about、contact 等）
├── stores/         # Pinia ストア（生成状態）
server/
├── api/            # API ルート（generate, upload/presign, jobs 等）
├── utils/          # Gemini、Blob、レート制限、Supabase 等
docs/               # 要件・仕様・設計ドキュメント
```

## ドキュメント

- [要件定義書](docs/requirement.md)
- [機能一覧](docs/features/features.md)
- [API設計](docs/designs/api-design.md)
- [データベース設計](docs/designs/database-design.md)
- [UI機能詳細](docs/features/ui-features.md)

## ライセンス

[LICENSE](LICENSE) を参照してください。
