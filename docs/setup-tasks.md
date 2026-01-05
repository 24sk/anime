# Nuxtプロジェクト初期設定タスク

このドキュメントは、AniMeプロジェクトのNuxt 4アプリケーションを初期セットアップするためのステップバイステップガイドです。

## 前提条件

- **Node.js 24.x**がインストールされていること（Supabaseとの親和性が高く、最新のLTSバージョン）
  - 推奨: Node.js 24.12.0以上
  - 確認方法: `node --version`
- pnpmがインストールされていること（推奨パッケージマネージャー）
- Gitがインストールされていること
- Supabaseアカウントが作成済みであること
- Vercelアカウントが作成済みであること
- Google Cloud Platformアカウントが作成済みで、Gemini APIが有効化されていること

## セットアップタスク一覧

### 1. プロジェクトの作成

- [x] 1.1 Nuxt 4プロジェクトの初期化

```bash
# 現在のanimeディレクトリ直下にNuxt 4プロジェクトを作成
# 注意: animeディレクトリが既に存在する場合、その中に作成されます
npx nuxi@latest init .

# または、明示的に現在のディレクトリを指定
npx nuxi@latest init anime
```

- [x] 1.2 パッケージマネージャーの設定

```bash
# pnpmを使用する場合（推奨）
pnpm install

# または npm を使用する場合
npm install
```

### 2. 依存関係のインストール

- [x] 2.1 コア依存関係

```bash
# NuxtUI（v4.3.0以上）
pnpm add @nuxt/ui

# Supabase統合モジュール（NuxtとSupabaseの最適な連携）
pnpm add @nuxtjs/supabase

# Vercel Blob SDK
pnpm add @vercel/blob

# Google Gemini API SDK
pnpm add @google/generative-ai

# UUID生成ライブラリ
pnpm add uuid
pnpm add -D @types/uuid

# Zod（スキーマバリデーション）
pnpm add zod

# Pinia（状態管理）
pnpm add pinia @pinia/nuxt

# 日付処理ライブラリ（必要に応じて）
pnpm add date-fns
```

- [x] 2.2 開発依存関係

```bash
# TypeScript型定義
pnpm add -D @types/node

# リント・フォーマットツール
pnpm add -D eslint @nuxt/eslint-config prettier

# テストフレームワーク（必要に応じて）
pnpm add -D vitest @vue/test-utils

# E2Eテスト（必要に応じて）
pnpm add -D @playwright/test
```

- [x] 2.3 Nuxtモジュールの設定

`nuxt.config.ts`に以下のモジュールを追加：

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase', // Supabase統合モジュール（必須）
    '@nuxt/image', // 画像最適化（必要に応じて）
    '@pinia/nuxt', // Pinia状態管理（必須）
  ],
  // Supabase設定
  supabase: {
    redirect: false, // 認証なしモデルのためリダイレクト無効
  },
  // ... その他の設定
})
```

### 3. 環境変数の設定

- [ ] 3.1 `.env`ファイルの作成

プロジェクトルートに`.env`ファイルを作成し、以下の環境変数を設定：

```env
# Supabase設定
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Gemini API設定
GEMINI_API_KEY=your_gemini_api_key

# Vercel Blob設定
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# アプリケーション設定
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] 3.2 `.env.example`ファイルの作成

`.env.example`ファイルを作成し、環境変数のテンプレートを記載（機密情報は含めない）：

```env
# Supabase設定
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Gemini API設定
GEMINI_API_KEY=

# Vercel Blob設定
BLOB_READ_WRITE_TOKEN=

# アプリケーション設定
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] 3.3 `.gitignore`の確認

`.env`ファイルが`.gitignore`に含まれていることを確認：

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### 4. Supabaseの設定

- [ ] 4.1 Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクトURLとAnon Keyを取得し、`.env`に設定

- [ ] 4.2 データベーススキーマの作成

`docs/database-design.md`に記載されているSQLスクリプトを実行：

1. Supabase DashboardのSQL Editorを開く
2. 以下のSQLを実行：
   - `job_status` Enum型の作成
   - `generation_jobs`テーブルの作成
   - `rate_limits`テーブルの作成
   - インデックスの作成
   - RLSポリシーの設定

- [x] 4.3 Supabaseクライアントの設定

`@nuxtjs/supabase`モジュールを使用している場合、`useSupabaseClient()`コンポーザブルが自動的に利用可能になります。

`app/composables/useSupabase.ts`を作成（必要に応じて）：

```typescript
import type { Database } from '~/shared/types/database.types'

export const useSupabase = () => {
  // @nuxtjs/supabaseモジュールが提供するコンポーザブルを使用
  const supabase = useSupabaseClient<Database>()
  return supabase
}
```

**注意**: `@nuxtjs/supabase`モジュールを使用している場合、環境変数は自動的に読み込まれます。`.env`ファイルに以下の変数を設定してください：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 5. Vercel Blobの設定

- [ ] 5.1 Vercel Blobストレージの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクト設定から「Storage」タブを開く
3. 「Create Database」→「Blob」を選択
4. Blobストレージを作成し、`BLOB_READ_WRITE_TOKEN`を取得

- [ ] 5.2 Vercel Blob SDKの設定

`server/utils/blob.ts`を作成：

```typescript
import { put, del } from '@vercel/blob'

export const uploadToBlob = async (file: File, path: string) => {
  const config = useRuntimeConfig()
  // 実装
}

export const deleteFromBlob = async (url: string) => {
  const config = useRuntimeConfig()
  // 実装
}
```

### 6. NuxtUIの設定

- [x] 6.1 NuxtUIモジュールの確認

`nuxt.config.ts`でNuxtUIモジュールが正しく設定されていることを確認：

```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  // NuxtUIは自動的にTailwind CSSを設定します
})
```

- [ ] 6.2 Tailwind CSSの設定確認

NuxtUIは自動的にTailwind CSSを設定しますが、カスタム設定が必要な場合は`tailwind.config.js`を作成：

```javascript
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      // カスタムテーマ設定
    },
  },
}
```

### 7. ディレクトリ構造の作成

- [x] 7.1 基本的なディレクトリ構造

Nuxt 4の最新ディレクトリ構成に従い、以下のディレクトリ構造を作成：

```text
anime/
├── app/
│   ├── components/      # Vueコンポーネント（自動インポート）
│   │   ├── common/      # 共通コンポーネント
│   │   └── pages/       # ページ固有コンポーネント
│   │       ├── home/    # トップページ用コンポーネント
│   │       ├── generating/  # 生成中画面用コンポーネント
│   │       └── result/  # 結果画面用コンポーネント
│   ├── composables/     # コンポーザブル関数（自動インポート）
│   ├── layouts/         # レイアウトコンポーネント
│   ├── middleware/      # ルートミドルウェア
│   ├── pages/           # ページコンポーネント（ファイルベースルーティング）
│   ├── plugins/         # プラグイン
│   ├── stores/          # Piniaストア（自動インポート）
│   ├── utils/           # ユーティリティ関数（自動インポート）
│   ├── app.vue          # ルートコンポーネント
│   ├── app.config.ts    # アプリケーション設定
│   └── error.vue        # エラーページ
├── server/
│   ├── api/             # APIエンドポイント
│   │   ├── generate/    # 生成リクエスト
│   │   ├── upload/      # アップロード関連
│   │   └── jobs/        # ジョブ管理
│   └── utils/           # サーバーサイドユーティリティ
├── shared/              # クライアントとサーバー間で共有するコード
│   └── types/           # TypeScript型定義（共有）
├── public/              # 静的ファイル
├── docs/                # ドキュメント（既存）
└── nuxt.config.ts       # Nuxt設定ファイル
```

**注意**: Nuxt 4では、`app/`ディレクトリ配下に多くのディレクトリを配置しますが、`server/`ディレクトリはルートに配置します。

- [ ] 7.2 ディレクトリの作成コマンド

```bash
# appディレクトリ配下のコンポーネント
mkdir -p app/components/common
mkdir -p app/components/pages/home
mkdir -p app/components/pages/generating
mkdir -p app/components/pages/result

# appディレクトリ配下のその他
mkdir -p app/composables
mkdir -p app/layouts
mkdir -p app/middleware
mkdir -p app/pages
mkdir -p app/plugins
mkdir -p app/stores
mkdir -p app/utils

# サーバーサイドディレクトリ（ルートに配置）
mkdir -p server/api/generate
mkdir -p server/api/upload
mkdir -p server/api/jobs
mkdir -p server/utils

# 共有ディレクトリ
mkdir -p shared/types

# その他
mkdir -p public
```

### 8. 型定義の設定

- [x] 8.1 Supabaseから型を生成

Supabase CLIを使用してデータベーススキーマからTypeScript型を自動生成します：

```bash
# Supabase CLIをインストール（まだの場合）
pnpm add -D supabase@">=1.8.1"

# Supabaseにログイン
npx supabase login

# Supabaseプロジェクトを初期化（初回のみ）
npx supabase init

# データベース型を生成
# PROJECT_REFはSupabaseダッシュボードのプロジェクト設定から取得
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > shared/types/database.types.ts

# または、ローカル開発環境の場合
npx supabase gen types typescript --local > shared/types/database.types.ts
```

生成された型ファイル（`shared/types/database.types.ts`）には、データベーススキーマに基づいた型定義が含まれます。

- [x] 8.2 生成された型の使用

生成された型をSupabaseクライアントで使用します：

```typescript
// app/composables/useSupabase.ts
import type { Database } from '~/shared/types/database.types'

export const useSupabase = () => {
  const supabase = useSupabaseClient<Database>()
  return supabase
}
```

- [ ] 8.3 カスタム型定義の追加

必要に応じて、追加の型定義を`shared/types/`ディレクトリに作成します：

`shared/types/api.ts`を作成：

```typescript
import { z } from 'zod'
import type { Database } from './database.types'

// Zodスキーマ定義
export const generateRequestSchema = z.object({
  anon_session_id: z.string().uuid(),
  source_image_url: z.string().url(),
  style_type: z.enum(['3d-anime', 'watercolor', 'fluffy', 'cyberpunk']),
})

export const adCompleteRequestSchema = z.object({
  anon_session_id: z.string().uuid(),
})

// 型推論
export type GenerateRequest = z.infer<typeof generateRequestSchema>
export type AdCompleteRequest = z.infer<typeof adCompleteRequestSchema>

// データベース型のヘルパー型
export type JobStatus = Database['public']['Enums']['job_status']
export type StyleType = '3d-anime' | 'watercolor' | 'fluffy' | 'cyberpunk'

// テーブル型のヘルパー
export type GenerationJob = Database['public']['Tables']['generation_jobs']['Row']
export type RateLimit = Database['public']['Tables']['rate_limits']['Row']
```

### 9. 開発環境のセットアップ

- [ ] 9.1 開発サーバーの起動

```bash
# 開発サーバーを起動
pnpm dev

# ブラウザで http://localhost:3000 にアクセス
```

- [ ] 9.2 ビルドと型チェックの確認

```bash
# 型チェック
pnpm typecheck

# ビルド
pnpm build

# リント
pnpm lint
```

- [ ] 9.3 エディタ設定（VSCode推奨）

`.vscode/settings.json`を作成：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 10. 初期実装の確認

- [x] 10.1 基本的なページの作成

`app/pages/index.vue`を作成して、基本的な動作を確認：

```vue
<script setup lang="ts">
// 基本的なページコンポーネント
</script>

<template>
  <div>
    <h1>AniMe - AIペットアイコンジェネレーター</h1>
  </div>
</template>
```

- [ ] 10.2 Supabase接続の確認

Supabaseクライアントが正しく動作することを確認：

```typescript
// app/composables/useSupabase.ts を使用して接続テスト
// または、直接 useSupabaseClient() を使用
```

- [ ] 10.3 環境変数の確認

すべての環境変数が正しく読み込まれていることを確認：

```typescript
// server/api/test.ts を作成して環境変数の読み込みをテスト
```

## チェックリスト

セットアップ完了後、以下の項目を確認してください：

- [x] Nuxt 4プロジェクトが正常に作成されている
- [x] すべての依存関係がインストールされている（Pinia含む）
- [ ] `.env`ファイルが正しく設定されている
- [ ] Supabaseプロジェクトが作成され、データベーススキーマが適用されている
- [ ] Vercel Blobストレージが作成されている
- [x] NuxtUIが正しく設定されている
- [x] Piniaが正しく設定されている（`@pinia/nuxt`モジュール追加済み）
- [x] Tailwind CSSが動作している
- [x] ディレクトリ構造が作成されている（`app/stores/`含む）
- [x] Supabaseから型が生成されている（`shared/types/database.types.ts`）
- [x] Zodスキーマが設定されている
- [ ] 型定義ファイルが作成されている
- [ ] 開発サーバーが正常に起動する
- [ ] ビルドが成功する
- [ ] 型チェックが通る
- [ ] リントが通る

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照して実装を進めてください：

1. `docs/api-design.md` - APIエンドポイントの実装
2. `docs/ui-features.md` - UIコンポーネントの実装
3. `docs/features.md` - 機能要件の確認

## トラブルシューティング

### よくある問題

#### NuxtUIが正しく動作しない

- `nuxt.config.ts`でモジュールが正しく設定されているか確認
- `pnpm install`を再実行
- `.nuxt`ディレクトリを削除して再ビルド

#### Supabase接続エラー

- `.env`ファイルの環境変数が正しいか確認
- SupabaseプロジェクトのURLとキーが正しいか確認
- RLSポリシーが正しく設定されているか確認

#### Vercel Blob接続エラー

- `BLOB_READ_WRITE_TOKEN`が正しく設定されているか確認
- Vercel Blobストレージが作成されているか確認

#### 型エラーが発生する

- `pnpm typecheck`を実行してエラーを確認
- `shared/types/`ディレクトリの型定義が正しいか確認
- TypeScriptのバージョンが適切か確認

## 参考リンク

- [Nuxt 4 Documentation](https://nuxt.com/docs)
- [NuxtUI Documentation](https://ui.nuxt.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
