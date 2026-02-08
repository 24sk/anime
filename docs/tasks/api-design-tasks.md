# API実装タスク：AIペットアイコンジェネレーター「AniMe」

このドキュメントは、AniMeプロジェクトのAPIエンドポイント実装を進めるためのステップバイステップガイドです。

## 前提条件

- [x] Nuxt 4プロジェクトが初期化されている
- [x] 基本的なディレクトリ構造が作成されている
- [x] Supabaseプロジェクトが作成され、データベーススキーマが適用されている
- [x] `.env`ファイルが作成されている
- [x] 必要な依存パッケージがインストールされている（`@google/generative-ai`, `@vercel/blob`, `uuid`, `zod`）

## 実装タスク一覧

### 1. 外部サービス・環境準備

#### 1.1 Google AI Studio (Gemini API)

- [x] 1.1.1 Google AI Studio で API キーを発行

1. [Google AI Studio](https://aistudio.google.com/)にアクセス
2. 「Get API Key」をクリック
3. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
4. API キーを生成し、安全に保存

- [x] 1.1.2 `.env` ファイルに `GEMINI_API_KEY` を追加

プロジェクトルートの`.env`ファイルに以下を追加：

```env
# Gemini API設定
GEMINI_API_KEY=your_gemini_api_key_here
```

**注意**: `.env`ファイルは`.gitignore`に含まれていることを確認してください。

#### 1.2 Vercel Blob

- [x] 1.2.1 Vercel プロジェクトを作成し、Storage タブから Blob を有効化

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを作成（既存のプロジェクトを使用する場合はそのプロジェクトを選択）
3. プロジェクト設定から「Storage」タブを開く
4. 「Create Database」→「Blob」を選択
5. Blobストレージを作成

- [x] 1.2.2 `BLOB_READ_WRITE_TOKEN` を取得し、`.env` に追加

1. Vercel Dashboardの「Storage」タブから、作成したBlobストレージを選択
2. 「Settings」タブから「Environment Variables」を確認
3. `BLOB_READ_WRITE_TOKEN`をコピー
4. `.env`ファイルに追加：

```env
# Vercel Blob設定
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token_here
```

#### 1.3 依存パッケージのインストール

- [x] 1.3.1 必要なパッケージのインストール

```bash
# Google Gemini API SDK
pnpm add @google/generative-ai

# Vercel Blob SDK
pnpm add @vercel/blob
```

### 2. Server API の基本基盤作成

#### 2.1 API エンドポイント定義

- [x] 2.1.1 `server/api/generate.post.ts` の新規作成

`server/api/generate.post.ts`を作成し、基本的なエンドポイント構造を実装：

```typescript
import { z } from 'zod'
import type { H3Event } from 'h3'

// リクエストボディのスキーマ定義
const generateRequestSchema = z.object({
  anon_session_id: z.string().uuid('無効なセッションIDです'),
  source_image_url: z.string().url('無効な画像URLです'),
  style_type: z.enum([
    '3d-anime',
    'watercolor',
    'fluffy',
    'cyberpunk',
    'korean-style',
    'simple-illustration',
  ], {
    errorMap: () => ({ message: '無効なスタイルタイプです' }),
  }),
})

export default defineEventHandler(async (event: H3Event) => {
  // 実装を追加
})
```

- [x] 2.1.2 フロントエンドからのリクエストボディの受け取りとバリデーション

```typescript
export default defineEventHandler(async (event: H3Event) => {
  // リクエストボディを取得
  const body = await readBody(event)

  // Zodスキーマでバリデーション
  const validatedData = generateRequestSchema.parse(body)

  // バリデーション成功後の処理
  // TODO: 実装を追加
})
```

#### 2.2 ランタイム設定

- [x] 2.2.1 `nuxt.config.ts` の `runtimeConfig` に API キーを登録（セキュリティ確保）

`nuxt.config.ts`に以下を追加：

```typescript
export default defineNuxtConfig({
  // ... 既存の設定

  runtimeConfig: {
    // サーバーサイドでのみアクセス可能（セキュリティ確保）
    // 空文字にしておくと、NUXT_GEMINI_API_KEY という環境変数を自動で読み込みます
    geminiApiKey: '',
    // 空文字にしておくと、NUXT_BLOB_READ_WRITE_TOKEN という環境変数を自動で読み込みます
    blobReadWriteToken: '',
    
    // クライアントサイドでもアクセス可能（必要に応じて）
    public: {
      // 公開可能な設定
    },
  },
})
```

**注意**:

- `runtimeConfig`に設定された値は、サーバーサイドでのみアクセス可能です。クライアントサイドに露出させないように注意してください。
- Nuxt 3/4では、`runtimeConfig`のキー名に基づいて環境変数が自動的に読み込まれます。例：`geminiApiKey` → `NUXT_GEMINI_API_KEY`
- `.env`ファイルには`NUXT_GEMINI_API_KEY`と`NUXT_BLOB_READ_WRITE_TOKEN`を設定してください。

- [ ] 2.2.2 環境変数の読み込み確認

`server/api/test-config.ts`を作成して、環境変数が正しく読み込まれているか確認：

```typescript
export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  
  return {
    geminiApiKey: config.geminiApiKey ? '設定済み' : '未設定',
    blobReadWriteToken: config.blobReadWriteToken ? '設定済み' : '未設定',
  }
})
```

#### 2.3 レートリミット実装

- [x] 2.3.1 IPアドレスの取得とハッシュ化ロジックの実装

`server/utils/rate-limit.ts`を作成：

```typescript
import { createHash } from 'crypto'
import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/shared/types/database.types'

/**
 * サーバーサイド用のSupabaseクライアントを取得する
 * @remark クライアント用のcomposable（useSupabase）はサーバーサイドでは動作しないため、専用の関数を使用
 * @returns {SupabaseClient<Database>} Supabaseクライアントインスタンス
 */
function getSupabaseClient() {
  const config = useRuntimeConfig()
  
  if (!config.public.supabaseUrl || !config.public.supabaseKey) {
    throw new Error('Supabaseの環境変数が設定されていません')
  }

  return createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )
}

/**
 * レートリミット設定
 * @remark 環境変数から読み込むことも可能（例: process.env.RATE_LIMIT_MAX_REQUESTS）
 */
export const RATE_LIMIT_CONFIG = {
  // 1時間あたりの最大リクエスト数
  MAX_REQUESTS_PER_HOUR: 10,
  // リセット間隔（ミリ秒）
  RESET_INTERVAL_MS: 60 * 60 * 1000, // 1時間
} as const

/**
 * リクエストのIPアドレスを取得する
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {string} IPアドレス
 */
function getClientIP(event: H3Event): string {
  // X-Forwarded-Forヘッダーから取得（プロキシ経由の場合）
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  if (forwardedFor) {
    // 複数のIPが含まれる場合は最初のIPを使用
    return forwardedFor.split(',')[0].trim()
  }

  // X-Real-IPヘッダーから取得
  const realIP = getHeader(event, 'x-real-ip')
  if (realIP) {
    return realIP
  }

  // 直接接続の場合
  return event.node.req.socket.remoteAddress || 'unknown'
}

/**
 * IPアドレスをハッシュ化する（プライバシー保護）
 * @param {string} ip - IPアドレス
 * @returns {string} ハッシュ化されたIPアドレス
 */
function hashIP(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

/**
 * レートリミットチェックを実行する
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {Promise<{ allowed: boolean; remaining: number; resetAt: Date }>} チェック結果
 */
export async function checkRateLimit(
  event: H3Event
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const clientIP = getClientIP(event)
  const ipHash = hashIP(clientIP)
  const supabase = getSupabaseClient()

  // 現在の時刻
  const now = new Date()
  const resetAt = new Date(now.getTime() + RATE_LIMIT_CONFIG.RESET_INTERVAL_MS)

  // rate_limitsテーブルから現在のレートリミット情報を取得
  const { data: rateLimitData, error: selectError } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip_hash', ipHash)
    .single()

  if (selectError && selectError.code !== 'PGRST116') {
    // PGRST116は「レコードが見つからない」エラー（正常）
    // その他のエラーはログに記録して、レートリミットチェックをスキップ（サービス継続性のため）
    console.error('Rate limit check error:', selectError)
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR, resetAt }
  }

  if (!rateLimitData) {
    // 初回リクエストの場合、新規レコードを作成
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        ip_hash: ipHash,
        request_count: 1,
        last_request_at: now,
      })

    if (insertError) {
      console.error('Rate limit insert error:', insertError)
      // エラー時はレートリミットチェックをスキップ
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR, resetAt }
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR - 1,
      resetAt,
    }
  }

  // 最終リクエストからの経過時間を計算
  const lastRequestAt = new Date(rateLimitData.last_request_at)
  const timeSinceLastRequest = now.getTime() - lastRequestAt.getTime()

  // リセット間隔を超えている場合は、カウントをリセット
  if (timeSinceLastRequest >= RATE_LIMIT_CONFIG.RESET_INTERVAL_MS) {
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({
        request_count: 1,
        last_request_at: now,
      })
      .eq('ip_hash', ipHash)

    if (updateError) {
      console.error('Rate limit update error:', updateError)
      return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR, resetAt }
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR - 1,
      resetAt,
    }
  }

  // リクエスト数が上限に達しているかチェック
  if (rateLimitData.request_count >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(lastRequestAt.getTime() + RATE_LIMIT_CONFIG.RESET_INTERVAL_MS),
    }
  }

  // リクエスト数をインクリメント
  const { error: updateError } = await supabase
    .from('rate_limits')
    .update({
      request_count: rateLimitData.request_count + 1,
      last_request_at: now,
    })
    .eq('ip_hash', ipHash)

  if (updateError) {
    console.error('Rate limit update error:', updateError)
    // エラー時はレートリミットチェックをスキップ
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR, resetAt }
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR - (rateLimitData.request_count + 1),
    resetAt: new Date(lastRequestAt.getTime() + RATE_LIMIT_CONFIG.RESET_INTERVAL_MS),
  }
}
```

- [x] 2.3.2 `server/api/generate.post.ts` にレートリミットチェックを統合

`server/api/generate.post.ts`のリクエスト処理の最初でレートリミットチェックを実行：

```typescript
import { checkRateLimit, RATE_LIMIT_CONFIG } from '~/server/utils/rate-limit'
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES } from '~/server/utils/errors'

export default defineEventHandler(async (event: H3Event) => {
  // レートリミットチェック（最初に実行）
  const rateLimitResult = await checkRateLimit(event)
  
  if (!rateLimitResult.allowed) {
    // レートリミット超過時は429エラーを返す
    setResponseStatus(event, 429)
    setHeader(event, 'X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR))
    setHeader(event, 'X-RateLimit-Remaining', String(rateLimitResult.remaining))
    setHeader(event, 'X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)))
    
    throw createErrorResponse(
      429,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      ERROR_MESSAGES[ErrorCodes.RATE_LIMIT_EXCEEDED]
    )
  }

  // レートリミット情報をレスポンスヘッダーに追加（デバッグ用）
  setHeader(event, 'X-RateLimit-Limit', String(RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR))
  setHeader(event, 'X-RateLimit-Remaining', String(rateLimitResult.remaining))
  setHeader(event, 'X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)))

  // 以降の処理（バリデーション、画像生成など）
  const body = await readBody(event)
  const validatedData = generateRequestSchema.parse(body)
  // ...
})
```

**注意**:

- IPアドレスはハッシュ化して保存し、プライバシーを保護します
- レートリミットチェックでエラーが発生した場合でも、サービス継続性のためリクエストを許可します（ログに記録）
- レートリミット情報はレスポンスヘッダーに含め、クライアント側で適切なエラーメッセージを表示できます
- レートリミット設定（`MAX_REQUESTS_PER_HOUR`、`RESET_INTERVAL_MS`）は環境変数や設定ファイルから読み込むことも可能です

#### 2.4 サーバーサイド用Supabaseクライアントの作成

- [x] 2.4.1 `server/utils/supabase.ts` の作成

クライアント用のcomposable（`useSupabase`）はサーバーサイドでは動作しないため、サーバーサイド専用のSupabaseクライアントを作成します。

`server/utils/supabase.ts`を作成：

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/shared/types/database.types'

/**
 * サーバーサイド用のSupabaseクライアントを取得する
 * @remark クライアント用のcomposable（useSupabase）はサーバーサイドでは動作しないため、専用の関数を使用
 * @returns {SupabaseClient<Database>} Supabaseクライアントインスタンス
 */
export function getSupabaseClient() {
  const config = useRuntimeConfig()
  
  if (!config.public.supabaseUrl || !config.public.supabaseKey) {
    throw new Error('Supabaseの環境変数が設定されていません')
  }

  return createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )
}
```

**注意**:

- `nuxt.config.ts`の`runtimeConfig.public`に`supabaseUrl`と`supabaseKey`を設定してください
- 環境変数は`NUXT_PUBLIC_SUPABASE_URL`と`NUXT_PUBLIC_SUPABASE_KEY`として設定します

- [x] 2.4.2 ポーリング用のエンドポイント作成

202 Acceptedで`job_id`を返した後、フロントエンドは「生成が完了したか」を確認する必要があります。Supabase Realtimeを使用する場合は不要ですが、フォールバックとしてポーリング用のエンドポイントを作成します。

`server/api/jobs/[id].get.ts`を作成：

```typescript
import { getSupabaseClient } from '~/server/utils/supabase'
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES } from '~/server/utils/errors'
import { z } from 'zod'

// パスパラメータのスキーマ定義
const jobIdSchema = z.string().uuid('無効なジョブIDです')

export default defineEventHandler(async (event: H3Event) => {
  // パスパラメータからjob_idを取得
  const jobId = getRouterParam(event, 'id')
  
  if (!jobId) {
    throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, 'ジョブIDが指定されていません')
  }

  // バリデーション
  const validatedJobId = jobIdSchema.parse(jobId)

  // Supabaseからジョブの状態を取得
  const supabase = getSupabaseClient()
  const { data: job, error } = await supabase
    .from('generation_jobs')
    .select('id, status, result_image_url, error_message, created_at, completed_at')
    .eq('id', validatedJobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // レコードが見つからない場合
      throw createErrorResponse(404, ErrorCodes.INTERNAL_SERVER_ERROR, 'ジョブが見つかりません')
    }
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR])
  }

  return {
    job_id: job.id,
    status: job.status,
    result_image_url: job.result_image_url,
    error_message: job.error_message,
    created_at: job.created_at,
    completed_at: job.completed_at,
  }
})
```

**注意**:

- このエンドポイントはSupabase Realtimeのフォールバックとして使用します
- フロントエンドでは、まずSupabase Realtimeでジョブの状態を監視し、Realtimeが利用できない場合のみこのエンドポイントを使用します

### 3. Gemini による画像解析・プロンプト生成ロジック

#### 3.1 マルチモーダル設定

- [x] 3.1.1 `gemini-2.0-flash` モデルを使用して、アップロードされた元画像を解析するロジックの実装

**注意**: 最新のモデルは「Gemini 2.0 Flash」（2025年1月30日リリース）です。APIでの実際のモデル名は[Google AI Studio Documentation](https://ai.google.dev/docs)で最新の情報を確認してください。

`server/utils/gemini.ts`を作成：

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Gemini APIクライアントを初期化する
 * @returns {GoogleGenerativeAI} Gemini APIクライアントインスタンス
 */
export function getGeminiClient() {
  const config = useRuntimeConfig()
  
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません')
  }

  return new GoogleGenerativeAI(config.geminiApiKey)
}

/**
 * 画像を解析してペットの特徴を抽出する
 * @param {string} imageUrl - 解析する画像のURL
 * @returns {Promise<string>} 抽出されたペットの特徴（テキスト）
 */
export async function analyzePetImage(imageUrl: string): Promise<string> {
  const genAI = getGeminiClient()
  // 最新のモデル: gemini-2.0-flash（2025年1月30日リリース）
  // 注意: 実際のAPIでのモデル名は公式ドキュメントで確認してください
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // 画像を取得してBase64に変換（またはURLを直接渡す）
  // TODO: 画像取得とBase64変換の実装

  // システムプロンプトの設計
  const systemInstruction = `
あなたはペットの特徴を分析する専門家です。
アップロードされたペットの写真から、以下の情報を抽出してください：
- 種類（犬、猫など）
- 毛色・模様
- 装飾品（首輪、リボンなど）
- 表情・特徴的なポーズ

抽出した情報は、30代の飼い主が「うちの子」を表現するために使える、温かみのある日本語で記述してください。
`

  // TODO: 画像解析の実装
  // const result = await model.generateContent([systemInstruction, imageData])
  // return result.response.text()
}
```

#### 3.2 システムプロンプトの設計

- [x] 3.2.1 ターゲットペルソナ（30代飼い主）向けに、ペットの特徴（毛色・種類・装飾品）を抽出する指示出しの作成

`server/utils/prompts.ts`を作成：

```typescript
/**
 * ペット画像解析用のシステムプロンプトを生成する
 * @returns {string} システムプロンプト
 */
export function getPetAnalysisPrompt(): string {
  return `
あなたはペットの特徴を分析する専門家です。
アップロードされたペットの写真から、以下の情報を抽出してください：

1. 種類: 犬、猫、その他のペットの種類
2. 毛色・模様: 具体的な色や模様の特徴
3. 装飾品: 首輪、リボン、バンダナなどの装飾品の有無と特徴
4. 表情・ポーズ: 特徴的な表情やポーズ

抽出した情報は、30代の飼い主が「うちの子」を表現するために使える、温かみのある日本語で記述してください。
例：「茶色と白のまだら模様の柴犬。首に赤い首輪をしています。優しい目をしており、少し首をかしげたポーズです。」
`
}

/**
 * スタイルタイプに基づいて画像生成用のプロンプトを生成する
 * @param {string} styleType - スタイルタイプ（3d-anime, watercolor等）
 * @param {string} petDescription - ペットの特徴説明（画像解析結果）
 * @returns {string} 画像生成用プロンプト（英語）
 */
export function getImageGenerationPrompt(
  styleType: string,
  petDescription: string
): string {
  const stylePrompts: Record<string, string> = {
    '3d-anime': 'Transform this pet into a 3D Pixar-style animated character. High detail, soft fur, expressive eyes.',
    'watercolor': 'Create a soft watercolor painting of this pet. Artistic splashes, pastel colors, white background.',
    'fluffy': 'A cute, hand-drawn fluffy illustration. Warm and cozy vibes, simple lines.',
    'cyberpunk': 'Cool cyberpunk pet icon. Neon lights, futuristic accessories, vibrant glowing colors.',
    'korean-style': 'Create a modern Korean-style pet icon. Vibrant colors, smooth gradients, cute and charming design, popular K-pop aesthetic.',
    'simple-illustration': 'Create a simple, minimalist pet icon. Clean lines, solid colors, white or transparent background, modern and versatile.',
  }

  const stylePrompt = stylePrompts[styleType] || stylePrompts['simple-illustration']
  
  return `${stylePrompt} Based on: ${petDescription}`
}
```

- [x] 3.2.2 選択されたスタイル（3Dアニメ、水彩画等）を英語の画像生成用プロンプトに変換するロジック

上記の`getImageGenerationPrompt`関数を実装し、スタイルタイプとペットの特徴説明を組み合わせて画像生成用プロンプトを生成します。

#### 3.3 Imagen 3 (画像生成) の統合

- [x] 3.3.1 Gemini API を介して Imagen モデルを呼び出し、実際の画像を生成する実装

`server/utils/gemini.ts`に画像生成関数を追加：

```typescript
/**
 * Imagen 3を使用して画像を生成する
 * @param {string} sourceImageUrl - 元画像のURL
 * @param {string} prompt - 画像生成用プロンプト
 * @returns {Promise<Buffer>} 生成された画像データ（バイナリ）
 */
export async function generateImageWithImagen(
  sourceImageUrl: string,
  prompt: string
): Promise<Buffer> {
  const genAI = getGeminiClient()
  
  // 画像生成には Gemini 画像生成モデル（gemini-2.5-flash-image）を使用。
  // Imagen は generateContent 非対応のため、image-to-image は Gemini の generateContent で実施。
  // 実装: server/utils/gemini.ts の generateImageWithImagen を参照。
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })
  const result = await model.generateContent([prompt, sourceImage])
  // response.candidates[0].content.parts から inlineData.data を取得
}
```

**注意**:

- 画像生成（image-to-image）は [Gemini Image Generation](https://ai.google.dev/gemini-api/docs/image-generation) を参照。
- モデル `gemini-2.5-flash-image` は generateContent で画像入力・画像出力をサポートする。

### 4. ストレージ連携 (Vercel Blob)

#### 4.1 画像アップロードの実装

- [x] 4.1.1 生成された画像（または処理後の画像）を `put()` メソッドで Vercel Blob にアップロード

`server/utils/blob.ts`を作成：

```typescript
import { put, del } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'

/**
 * 画像をVercel Blobにアップロードする
 * @param {Buffer} imageData - アップロードする画像データ（バイナリ）
 * @param {string} anonSessionId - 匿名セッションID
 * @param {string} jobId - ジョブID
 * @param {string} type - 画像タイプ（'raw' | 'result'）
 * @returns {Promise<{ url: string }>} アップロードされた画像のURL
 */
export async function uploadImageToBlob(
  imageData: Buffer,
  anonSessionId: string,
  jobId: string,
  type: 'raw' | 'result'
): Promise<{ url: string }> {
  const config = useRuntimeConfig()
  
  if (!config.blobReadWriteToken) {
    throw new Error('BLOB_READ_WRITE_TOKENが設定されていません')
  }

  // ファイル名の生成（パス構造: uploads/{anon_session_id}/{job_id}_raw.jpg または results/{anon_session_id}/{job_id}_icon.png）
  const extension = type === 'raw' ? 'jpg' : 'png'
  const pathPrefix = type === 'raw' ? 'uploads' : 'results'
  const filename = `${jobId}_${type === 'raw' ? 'raw' : 'icon'}.${extension}`
  const path = `${pathPrefix}/${anonSessionId}/${filename}`

  // Vercel Blobにアップロード
  const blob = await put(path, imageData, {
    access: 'public',
    token: config.blobReadWriteToken,
    contentType: type === 'raw' ? 'image/jpeg' : 'image/png',
  })

  return { url: blob.url }
}

/**
 * Vercel Blobから画像を削除する
 * @param {string} url - 削除する画像のURL
 */
export async function deleteImageFromBlob(url: string): Promise<void> {
  const config = useRuntimeConfig()
  
  if (!config.blobReadWriteToken) {
    throw new Error('BLOB_READ_WRITE_TOKENが設定されていません')
  }

  await del(url, {
    token: config.blobReadWriteToken,
  })
}
```

- [x] 4.1.2 `uuid` を使用した一意のファイル名管理

上記の`uploadImageToBlob`関数で、`jobId`（UUID）を使用して一意のファイル名を生成しています。`server/api/generate.post.ts`でジョブIDを生成する際に`uuid`を使用：

```typescript
import { v4 as uuidv4 } from 'uuid'

// ジョブIDの生成
const jobId = uuidv4()
```

- [x] 4.1.4 画像アップロード用署名付きURL発行エンドポイントの実装

クライアントが直接Vercel Blobへ元画像をアップロードするための署名付きURLを発行するエンドポイントを実装します。

`server/api/upload/presign.post.ts`を作成：

```typescript
import { z } from 'zod'
import type { H3Event } from 'h3'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES } from '~~/server/utils/errors'

// リクエストボディのスキーマ定義
const presignRequestSchema = z.object({
  filename: z.string().min(1, 'ファイル名が指定されていません'),
  contentType: z.string().refine(
    (val) => val.startsWith('image/'),
    { message: '画像ファイルのみアップロード可能です' }
  )
})

/**
 * 画像アップロード用署名付きURLを発行するエンドポイント
 * @param {H3Event} event - H3イベントオブジェクト
 * @returns {Promise<{ uploadUrl: string; accessUrl: string }>} 署名付きURLとアクセスURL
 */
export default defineEventHandler(async (event: H3Event) => {
  try {
    const config = useRuntimeConfig()

    if (!config.blobReadWriteToken) {
      throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, 'BLOB_READ_WRITE_TOKENが設定されていません')
    }

    // リクエストボディを取得
    const body = await readBody(event)

    // Zodスキーマでバリデーション
    const validatedData = presignRequestSchema.parse(body)

    // 一意のファイル名を生成（UUID + 元のファイル名）
    const uniqueFilename = `${uuidv4()}_${validatedData.filename}`
    const path = `uploads/temp/${uniqueFilename}`

    // 署名付きURLを生成（Vercel Blob SDKのputメソッドを使用）
    // 注意: Vercel Blob SDKは署名付きURLを直接生成する機能がないため、
    // 一時的な空ファイルをアップロードしてURLを取得する方法を使用
    // または、Vercel Blob APIを直接呼び出す方法を検討

    // 一時的な空ファイルをアップロードしてURLを取得
    const blob = await put(path, Buffer.from(''), {
      access: 'public',
      token: config.blobReadWriteToken,
      contentType: validatedData.contentType,
      addRandomSuffix: false
    })

    // 署名付きURLを生成（PUTメソッド用）
    // Vercel Blobの署名付きURLは、putメソッドで取得したURLを使用
    // クライアント側でPUTメソッドでアップロード可能
    const uploadUrl = blob.url

    return {
      uploadUrl,
      accessUrl: blob.url
    }
  } catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createErrorResponse(400, ErrorCodes.INTERNAL_SERVER_ERROR, error.issues[0]?.message || 'バリデーションエラー')
    }

    // その他のエラー（既にH3Errorの場合はそのままthrow）
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // 予期しないエラー
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR])
  }
})
```

**注意**:

- Vercel Blob SDKは署名付きURLを直接生成する機能がないため、一時的な空ファイルをアップロードしてURLを取得する方法を使用しています
- クライアント側では、取得した`uploadUrl`に対してPUTメソッドで画像をアップロードします
- ファイル名はUUIDを付与して一意性を確保します
- パス構造は`uploads/temp/`を使用し、一時的なアップロードとして扱います

**代替実装案**:

Vercel Blobの署名付きURL機能が利用可能な場合は、以下のような実装も検討できます：

```typescript
// Vercel Blob APIを直接呼び出して署名付きURLを生成
const response = await $fetch('https://blob.vercel-storage.com/presign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${config.blobReadWriteToken}`
  },
  body: {
    path,
    contentType: validatedData.contentType
  }
})
```

ただし、Vercel Blob SDKの最新バージョンで署名付きURL機能がサポートされているか確認が必要です。

#### 4.2 接続テスト

- [x] 4.1.3 エラー発生時の `deleteImageFromBlob` 呼び出しの徹底

生成に失敗した際や、一時的なアップロード画像を放置しないための処理を実装します。

`server/api/generate.post.ts`のエラーハンドリングで、以下のようにクリーンアップ処理を追加：

```typescript
// エラー発生時の処理（event.waitUntil内）
catch (error) {
  // エラー発生時はVercel Blobの画像を削除（クリーンアップ）
  try {
    // 元画像を削除
    if (validatedData.source_image_url) {
      await deleteImageFromBlob(validatedData.source_image_url)
    }
    
    // 生成途中でエラーが発生した場合、生成画像も削除
    // （生成画像がアップロードされていた場合のみ）
    // TODO: 生成画像のURLを追跡して削除する処理を追加
  } catch (deleteError) {
    // 削除エラーはログに記録するが、メインのエラーハンドリングを中断しない
    console.error('Failed to delete image from blob:', deleteError)
  }

  // ステータスをfailedに更新
  await supabase
    .from('generation_jobs')
    .update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : '不明なエラー',
    })
    .eq('id', jobId)
}
```

**注意**:

- エラー発生時は必ず一時的な画像を削除し、ストレージコストを削減します
- 削除処理でエラーが発生しても、メインのエラーハンドリングを中断しないようにします
- 生成画像のURLを追跡するため、生成処理の各ステップでURLを保存することを推奨します

#### 4.3 接続テスト

- [ ] 4.3.1 管理画面から実際に画像が保存され、URL でアクセスできることを確認

`server/api/test-blob.ts`を作成して、Vercel Blobへの接続をテスト：

```typescript
import { uploadImageToBlob } from '~/server/utils/blob'

export default defineEventHandler(async (event: H3Event) => {
  // テスト用の画像データ（1x1ピクセルのPNG）
  const testImageData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )

  try {
    const testSessionId = 'test-session-id'
    const testJobId = 'test-job-id'
    
    const result = await uploadImageToBlob(
      testImageData,
      testSessionId,
      testJobId,
      'result'
    )

    return {
      success: true,
      url: result.url,
      message: 'Vercel Blobへの接続が成功しました',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
})
```

### 5. 仕上げ・最適化

#### 5.1 エラーハンドリング

- [x] 5.1.1 API 制限（Rate Limit）や不適切な画像が送られた際のエラーレスポンス設計

`server/utils/errors.ts`を作成：

```typescript
import type { H3Error } from 'h3'

/**
 * エラーコード定義
 * @remark プロジェクトの一貫性のため、as constパターンを使用
 */
export const ErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
} as const

/**
 * エラーコードの型
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * エラーレスポンスを生成する
 * @param {number} statusCode - HTTPステータスコード
 * @param {ErrorCode} errorCode - エラーコード
 * @param {string} message - エラーメッセージ
 * @returns {H3Error} H3エラーオブジェクト
 */
export function createErrorResponse(
  statusCode: number,
  errorCode: ErrorCode,
  message: string
): H3Error {
  return createError({
    statusCode,
    statusMessage: errorCode,
    data: {
      code: errorCode,
      message,
    },
  })
}

/**
 * ユーザーフレンドリーなエラーメッセージマッピング
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
  [ErrorCodes.INVALID_IMAGE_FORMAT]: '対応していない画像形式です。JPGまたはPNGを使用してください。',
  [ErrorCodes.CONTENT_POLICY_VIOLATION]: 'AIの安全ポリシーにより生成できませんでした。別の写真でお試しください。',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: '予期せぬエラーが発生しました。時間を置いてやり直してください。',
  [ErrorCodes.AI_SERVICE_UNAVAILABLE]: 'AIサーバーが一時的に混み合っています。時間を置いてやり直してください。',
}
```

`server/api/generate.post.ts`でエラーハンドリングを実装：

```typescript
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES } from '~/server/utils/errors'

export default defineEventHandler(async (event: H3Event) => {
  try {
    // リクエスト処理
    // ...
  } catch (error) {
    // Gemini APIのセーフティフィルタによる拒否の場合
    if (error.statusCode === 422) {
      throw createErrorResponse(422, ErrorCodes.CONTENT_POLICY_VIOLATION, ERROR_MESSAGES[ErrorCodes.CONTENT_POLICY_VIOLATION])
    }
    
    // その他のエラー
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR])
  }
})
```

#### 5.2 レスポンス設計

- [x] 5.2.1 フロントエンドの「結果画面」で必要となる URL やメタデータを返す処理

`server/api/generate.post.ts`で、Supabaseにジョブを保存し、レスポンスを返す：

```typescript
import { getSupabaseClient } from '~/server/utils/supabase'
import { v4 as uuidv4 } from 'uuid'
import { createErrorResponse, ErrorCodes, ERROR_MESSAGES } from '~/server/utils/errors'
import { generateImageWithImagen } from '~/server/utils/gemini'
import { uploadImageToBlob, deleteImageFromBlob } from '~/server/utils/blob'
import { getImageGenerationPrompt } from '~/server/utils/prompts'

export default defineEventHandler(async (event: H3Event) => {
  // バリデーション
  const body = await readBody(event)
  const validatedData = generateRequestSchema.parse(body)

  // ジョブIDの生成
  const jobId = uuidv4()

  // Supabaseにジョブを作成
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('generation_jobs')
    .insert({
      id: jobId,
      anon_session_id: validatedData.anon_session_id,
      source_image_url: validatedData.source_image_url,
      style_type: validatedData.style_type,
      status: 'pending',
    })

  if (error) {
    throw createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, ERROR_MESSAGES[ErrorCodes.INTERNAL_SERVER_ERROR])
  }

  // 非同期で画像生成処理を開始（バックグラウンド処理）
  // event.waitUntil()を使用することで、レスポンス送信後も処理を継続できます
  // これがないと、サーバーレス環境ではレスポンス送信後にインスタンスが即座に終了し、AI生成が中断される恐れがあります
  event.waitUntil(
    (async () => {
      try {
        // ステータスをprocessingに更新
        await supabase
          .from('generation_jobs')
          .update({ status: 'processing' })
          .eq('id', jobId)

        // 画像生成処理
        // TODO: 画像解析とプロンプト生成の実装
        const prompt = getImageGenerationPrompt(validatedData.style_type, 'pet description')
        const generatedImage = await generateImageWithImagen(validatedData.source_image_url, prompt)

        // 生成画像をVercel Blobにアップロード
        const { url: resultUrl } = await uploadImageToBlob(
          generatedImage,
          validatedData.anon_session_id,
          jobId,
          'result'
        )

        // ステータスをcompletedに更新
        await supabase
          .from('generation_jobs')
          .update({
            status: 'completed',
            result_image_url: resultUrl,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      } catch (error) {
        // エラー発生時の処理
        const errorMessage = error instanceof Error ? error.message : '不明なエラー'
        
        // エラー発生時はVercel Blobの画像を削除（クリーンアップ）
        try {
          if (validatedData.source_image_url) {
            await deleteImageFromBlob(validatedData.source_image_url)
          }
        } catch (deleteError) {
          console.error('Failed to delete image from blob:', deleteError)
        }

        // ステータスをfailedに更新
        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', jobId)
      }
    })()
  )

  // 202 Accepted を返す
  setResponseStatus(event, 202)
  return {
    job_id: jobId,
    status: 'pending',
  }
})
```

**注意**:

- `event.waitUntil()`を使用することで、レスポンス送信後もバックグラウンド処理を継続できます
- Nuxt（Nitro）のサーバーレス環境では、レスポンスを返した後に処理を継続させるために`event.waitUntil()`が必要です
- これを使わないと、レスポンス送信後にインスタンスが即座に終了し、AI生成が中断される恐れがあります

**⚠️ Vercel環境での実行時間制限（重要）**:

Vercel上で`event.waitUntil`を使用して重い非同期処理（画像解析 + 画像生成）を行う場合、VercelのServerless Functionsの実行時間制限に注意が必要です：

- **Hobby（無料）プラン**: 最大10秒
- **Proプラン**: 最大300秒（デフォルトは15秒〜、設定変更が必要）

Imagen 3による画像生成と解析を合わせると10秒を超える可能性があるため、もし無料プランで運用される場合は、タイムアウトで処理が中断されるリスクがあります。

**推奨アプローチ**:

1. **まずは現在の設計で実装し、実行時間を確認する**
   - 実際の処理時間を計測し、制限内に収まるか確認
   - Vercelのログで実行時間を監視

2. **タイムアウトが発生する場合の代替案**:
   - **Vercel Background Messages**: 非同期処理をキューに追加して実行
   - **Edge Functions**: より長い実行時間をサポート（ただし、Imagen 3のAPI呼び出しには制限がある可能性）
   - **外部ジョブキュー**: Supabase Edge Functionsや別のサーバーレス関数を使用

3. **Proプランを使用する場合**:
   - Vercelの設定でタイムアウトを最大300秒に変更可能
   - ただし、コストが発生するため、まずは実行時間を確認してから判断

#### 5.3 タイムアウト対策

- [ ] 5.3.1 画像生成に時間がかかる場合のタイムアウト設定の調整

`nuxt.config.ts`でタイムアウト設定を調整：

```typescript
export default defineNuxtConfig({
  // ... 既存の設定

  nitro: {
    // タイムアウト設定（ミリ秒）
    // デフォルトは30秒、画像生成には長めの設定が必要
    routeRules: {
      '/api/generate': {
        // 画像生成には最大60秒を設定
        // 注意: Vercelの実行時間制限（Hobby: 10秒、Pro: 最大300秒）を超えないように設定
        timeout: 60000,
      },
    },
  },
})
```

**⚠️ Vercel環境での実行時間制限（重要）**:

- **Hobby（無料）プラン**: 最大10秒の実行時間制限
- **Proプラン**: 最大300秒まで設定可能（デフォルトは15秒〜、設定変更が必要）

`nuxt.config.ts`でタイムアウトを設定しても、Vercelのプランによる実行時間制限が優先されます。無料プランでは10秒を超える処理は中断されるため、以下の対策を検討してください：

1. **実行時間の計測**: 実際の処理時間を計測し、制限内に収まるか確認
2. **Vercel Proプランへのアップグレード**: より長い実行時間が必要な場合
3. **代替アーキテクチャの検討**: Vercel Background Messagesや外部ジョブキューを使用

**推奨**: まずは現在の設計で実装し、実際の実行時間を確認してから、必要に応じてアーキテクチャを調整してください。

## チェックリスト

実装完了後、以下の項目を確認してください：

- [ ] Google AI StudioでAPIキーが発行されている
- [ ] `.env`ファイルに`GEMINI_API_KEY`が設定されている
- [ ] Vercel Blobストレージが作成されている
- [ ] `.env`ファイルに`BLOB_READ_WRITE_TOKEN`が設定されている
- [x] 必要な依存パッケージがインストールされている（`@google/generative-ai`, `@vercel/blob`, `uuid`）
- [ ] `nuxt.config.ts`の`runtimeConfig`にAPIキーが設定されている（空文字で自動読み込み）
- [x] `server/utils/supabase.ts`が作成され、サーバーサイド用のSupabaseクライアントが実装されている
- [x] `server/api/generate.post.ts`が作成されている
- [x] `server/utils/rate-limit.ts`が作成され、レートリミットチェックが実装されている
- [x] `server/api/generate.post.ts`にレートリミットチェックが統合されている
- [x] `server/api/jobs/[id].get.ts`が作成され、ポーリング用エンドポイントが実装されている
- [x] リクエストボディのバリデーションが実装されている
- [x] Gemini APIを使用した画像解析ロジックが実装されている
- [x] Imagen 3を使用した画像生成ロジックが実装されている
- [x] Vercel Blobへの画像アップロードが実装されている
- [x] エラー発生時のVercel Blobクリーンアップ処理が実装されている
- [x] `event.waitUntil()`を使用した非同期処理が実装されている
- [x] エラーハンドリングが実装されている
- [x] 適切なレスポンスが返される（202 Accepted）
- [ ] タイムアウト設定が調整されている

## 次のステップ

API実装が完了したら、以下のドキュメントを参照して実装を進めてください：

1. `docs/ui-features.md` - UIコンポーネントの実装
2. `docs/features.md` - 機能要件の確認
3. `docs/database-design.md` - データベース設計の確認

## トラブルシューティング

### よくある問題

#### Gemini API接続エラー

- `.env`ファイルの`GEMINI_API_KEY`が正しいか確認
- APIキーが有効期限内か確認
- Google AI StudioでAPIキーの使用状況を確認

#### Vercel Blob接続エラー

- `.env`ファイルの`BLOB_READ_WRITE_TOKEN`が正しいか確認
- Vercel Blobストレージが作成されているか確認
- トークンの権限（Read/Write）が正しいか確認

#### 画像生成エラー

- 画像形式が対応しているか確認（JPG、PNG）
- 画像サイズが適切か確認
- Gemini APIのセーフティフィルタによる拒否の可能性を確認

#### タイムアウトエラー

- `nuxt.config.ts`のタイムアウト設定を確認
- **Vercelのサーバーレス関数の実行時間制限を確認**
  - Hobby（無料）プラン: 最大10秒
  - Proプラン: 最大300秒（設定変更が必要）
- Vercelのログで実際の実行時間を確認
- Imagen 3による画像生成と解析を合わせると10秒を超える可能性があるため、無料プランではタイムアウトが発生する可能性があります
- **解決策**:
  1. まずは実行時間を計測し、制限内に収まるか確認
  2. タイムアウトが発生する場合:
     - Vercel Proプランへのアップグレードを検討
     - Vercel Background Messagesを使用
     - Edge Functionsや外部ジョブキューを検討

## 参考リンク

- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Gemini API Reference](https://ai.google.dev/api)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Nuxt 4 Server API Documentation](https://nuxt.com/docs/guide/directory-structure/server)
- [Zod Documentation](https://zod.dev/)
