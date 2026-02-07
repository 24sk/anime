# 未実装タスク一覧

このドキュメントは、`docs/api-design-tasks.md`に記載されている未実装タスクをまとめたものです。

## 1. APIエンドポイント実装

### 1.1 ポーリング用エンドポイント

- [ ] **2.4.2** `server/api/jobs/[id].get.ts` の作成
  - **目的**: Supabase Realtimeのフォールバックとして、ジョブの状態を取得するエンドポイント
  - **エンドポイント**: `GET /api/jobs/:id`
  - **実装内容**:
    - パスパラメータから`job_id`を取得
    - UUIDバリデーション
    - Supabaseからジョブの状態を取得
    - ステータス、結果画像URL、エラーメッセージなどを返す

### 1.2 画像アップロード用署名付きURL発行エンドポイント

- [ ] **4.1.4** `server/api/upload/presign.post.ts` の作成
  - **目的**: クライアントが直接Vercel Blobへ元画像をアップロードするための署名付きURLを発行
  - **エンドポイント**: `POST /api/upload/presign`
  - **リクエスト**: `{ filename: string, contentType: string }`
  - **レスポンス**: `{ uploadUrl: string, accessUrl: string }`
  - **実装内容**:
    - Zodスキーマによるバリデーション
    - UUIDを使用した一意のファイル名生成
    - Vercel Blob SDKを使用した署名付きURLの発行
    - エラーハンドリング

## 2. テスト・確認用エンドポイント

### 2.1 環境変数の読み込み確認

- [ ] **2.2.2** `server/api/test-config.ts` の作成
  - **目的**: 環境変数が正しく読み込まれているか確認するためのテストエンドポイント
  - **エンドポイント**: `GET /api/test-config`
  - **実装内容**:
    - `useRuntimeConfig()`で環境変数を取得
    - `geminiApiKey`と`blobReadWriteToken`の設定状態を返す

### 2.2 Vercel Blob接続テスト

- [ ] **4.3.1** `server/api/test-blob.ts` の作成
  - **目的**: Vercel Blobへの接続をテストし、画像が保存され、URLでアクセスできることを確認
  - **エンドポイント**: `GET /api/test-blob`
  - **実装内容**:
    - テスト用の1x1ピクセルPNG画像を生成
    - `uploadImageToBlob`関数を使用してアップロード
    - アップロードされたURLを返す

## 3. 設定・最適化

### 3.1 タイムアウト設定の調整

- [ ] **5.3.1** `nuxt.config.ts` のタイムアウト設定調整
  - **目的**: 画像生成に時間がかかる場合のタイムアウト設定を調整
  - **実装内容**:
    - `nitro.routeRules`に`/api/generate`のタイムアウト設定を追加
    - 最大60秒を設定（Vercelの実行時間制限を考慮）
  - **注意**: Vercelのプランによる実行時間制限（Hobby: 10秒、Pro: 最大300秒）を超えないように設定

## 4. 環境設定（手動設定が必要）

以下のタスクは、開発環境や本番環境で手動で設定する必要があります：

- [ ] **Google AI StudioでAPIキーが発行されている**
  - Google AI StudioでAPIキーを発行し、`.env`ファイルに設定

- [ ] **`.env`ファイルに`GEMINI_API_KEY`が設定されている**
  - 環境変数名: `NUXT_GEMINI_API_KEY`
  - `nuxt.config.ts`の`runtimeConfig.geminiApiKey`が自動的に読み込む

- [ ] **Vercel Blobストレージが作成されている**
  - Vercel DashboardでBlobストレージを作成

- [ ] **`.env`ファイルに`BLOB_READ_WRITE_TOKEN`が設定されている**
  - 環境変数名: `NUXT_BLOB_READ_WRITE_TOKEN`
  - `nuxt.config.ts`の`runtimeConfig.blobReadWriteToken`が自動的に読み込む

- [ ] **`.env`ファイルに`SUPABASE_SERVICE_ROLE_KEY`が設定されている**
  - 環境変数名: `NUXT_SUPABASE_SERVICE_ROLE_KEY`
  - `nuxt.config.ts`の`runtimeConfig.supabaseServiceRoleKey`が自動的に読み込む

- [ ] **`.env`ファイルに`PUBLIC_SUPABASE_URL`が設定されている**
  - 環境変数名: `NUXT_PUBLIC_SUPABASE_URL`
  - `nuxt.config.ts`の`runtimeConfig.public.supabaseUrl`が自動的に読み込む

## 実装優先順位

### 高優先度（必須）

1. **4.1.4** 画像アップロード用署名付きURL発行エンドポイント（フロントエンドで使用中）
2. **2.4.2** ポーリング用エンドポイント（Supabase Realtimeのフォールバック）

### 中優先度（推奨）

3. **2.2.2** 環境変数の読み込み確認（デバッグ用）
2. **4.3.1** Vercel Blob接続テスト（デバッグ用）

### 低優先度（必要に応じて）

5. **5.3.1** タイムアウト設定の調整（実際の実行時間を確認してから）

## 実装済みタスク（参考）

以下のタスクは既に実装済みです：

- ✅ `server/api/generate.post.ts` - 画像生成エンドポイント
- ✅ `server/utils/rate-limit.ts` - レートリミット実装
- ✅ `server/utils/supabase.ts` - サーバーサイド用Supabaseクライアント
- ✅ `server/utils/errors.ts` - エラーハンドリング
- ✅ `server/utils/prompts.ts` - プロンプト生成
- ✅ `server/utils/gemini.ts` - Gemini API統合（画像解析・画像生成）
- ✅ `server/utils/blob.ts` - Vercel Blob統合
- ✅ `nuxt.config.ts`の`runtimeConfig`設定
- ✅ フロントエンドのAPI呼び出し処理（`app/pages/index.vue`）
- ✅ 匿名セッションID管理（`app/composables/useAnonSession.ts`）
