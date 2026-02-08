# データベース設計書：AIペットアイコンジェネレーター「AniMe」

## 1. 設計方針

* **BaaS活用:** Supabase (PostgreSQL) をメインDBとし、リアルタイムな状態管理を実現します。
* **匿名セキュリティ:** 認証なし（非認証）運用のため、クライアント側で生成した `anon_session_id` をベースに Row Level Security (RLS) を設定し、他人の生成データへのアクセスを遮断します。
* **ステートレス・ストレージ:** 画像本体は Vercel Blob に保存。DBにはそのURLと、処理に必要なメタデータのみを格納します。

## 2. エンティティ（テーブル）定義

### ① `generation_jobs` (生成ジョブ管理)

AI生成の進捗、結果URL、および広告視聴状況を管理する基幹テーブル。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default: gen_random_uuid() | ジョブの一意識別子 |
| `anon_session_id` | UUID | Index, Not Null | クライアント側で生成・保持する匿名ID |
| `status` | job_status | Enum | 生成ステータス（Realtimeで監視） |
| `style_type` | Text | | ユーザーが選択したスタイル名 |
| `source_image_url` | Text | | ユーザーがUPした元画像の Vercel Blob URL |
| `result_image_url` | Text | | Geminiが生成したアイコンの Vercel Blob URL |
| `ad_viewed` | Boolean | Default: false | 広告視聴が完了したかどうかのフラグ |
| `error_message` | Text | | 失敗時の理由（セーフティフィルタによる拒否等） |
| `created_at` | Timestamptz | Default: now() | 生成リクエスト日時 |
| `completed_at` | Timestamptz | | 生成処理の完了日時 |

### ③ `feedbacks` (フィードバック管理)

生成結果に対するユーザーの評価（良・悪）を保存するテーブル。今後の品質改善に活用します。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default: gen_random_uuid() | フィードバックの一意識別子 |
| `job_id` | UUID | FK -> generation_jobs(id) | 対象の生成ジョブID |
| `anon_session_id` | UUID | Not Null | 投稿者の匿名セッションID |
| `selected_style` | Text | | ユーザーが選択したスタイル |
| `free_text` | Text | | ユーザーが入力したフリーテキスト |
| `feedback_type` | Text | Check ('good', 'bad') | 評価タイプ |
| `created_at` | Timestamptz | Default: now() | 投稿日時 |

## 3. 初期構築用SQLスクリプト (Supabase/MCP用)

```sql
-- 1. 列挙型の定義
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- 2. テーブル作成
CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_session_id UUID NOT NULL,
    status job_status DEFAULT 'pending',
    style_type TEXT NOT NULL,
    source_image_url TEXT,
    result_image_url TEXT,
    ad_viewed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
    anon_session_id UUID NOT NULL,
    selected_style TEXT,
    free_text TEXT,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('good', 'bad')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. インデックス作成
CREATE INDEX idx_jobs_session_id ON generation_jobs(anon_session_id);
CREATE INDEX idx_feedbacks_session_id ON feedbacks(anon_session_id);
CREATE INDEX idx_feedbacks_job_id ON feedbacks(job_id);

-- 4. RLSの有効化
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 5. セッションID取得ヘルパー（RLS initPlan 最適化・リント対応）
-- ポリシー内で current_setting() を直接書くと行ごとに再評価され警告になるため、
-- private スキーマのヘルパーを (select 関数) で呼び出し1回だけ評価する
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.request_anon_session_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT current_setting('request.headers', true)::json->>'x-anon-session-id';
$$;

-- 6. セキュリティポリシー定義 (generation_jobs)
-- 参照: ヘッダーに付与された session_id と一致するレコードのみ参照可能
CREATE POLICY "Users can view their own jobs" 
ON generation_jobs FOR SELECT 
USING (anon_session_id::text = (select private.request_anon_session_id()));

-- INSERT: ポリシーなし。anon では INSERT 不可。ジョブ作成はバックエンド（service_role）のみが実行する。
-- レート制限・バリデーションは API 層で実施。

-- 更新: 自分のセッションに紐づく行のみ更新可能。WITH CHECK で更新後の行も同一セッションに限定（anon_session_id の書き換えを防止）
CREATE POLICY "Users can update their own job status" 
ON generation_jobs FOR UPDATE 
USING (anon_session_id::text = (select private.request_anon_session_id()))
WITH CHECK (anon_session_id::text = (select private.request_anon_session_id()));

-- 7. セキュリティポリシー定義 (feedbacks)
-- INSERT: 自分のセッションIDでのみ投稿可能
CREATE POLICY "Users can create feedback" 
ON feedbacks FOR INSERT 
WITH CHECK (anon_session_id::text = (select private.request_anon_session_id()));

-- SELECT: 自分の投稿のみ参照可能（必要であれば）
CREATE POLICY "Users can view their own feedback" 
ON feedbacks FOR SELECT 
USING (anon_session_id::text = (select private.request_anon_session_id()));

-- 8. レートリミット管理用テーブル
CREATE TABLE IF NOT EXISTS rate_limits (
    ip_hash TEXT PRIMARY KEY,
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.1 既存環境の RLS 修正

**INSERT ポリシー緩和の解消**  
すでに `"Anyone can create jobs"` ポリシーで構築済みの場合は、以下を実行して anon による直接 INSERT を禁止する。

**UPDATE ポリシーの明示的 WITH CHECK**  
`"Users can update their own jobs"` / `"Users can update their own job status"` に明示的な WITH CHECK を付与し、スキャナの「常に true」検知を解消しつつ、更新後の行も同一セッションに限定する。

**パフォーマンス最適化（RLS initPlan）**  
ポリシー内で `current_setting()` を直接使うと行ごとに再評価され、Supabase のパフォーマンスアドバイザーで警告される。`private.request_anon_session_id()` を定義し、ポリシーでは `(select private.request_anon_session_id())` のみを参照すること。

```sql
-- ヘルパー関数（未作成時のみ）
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.request_anon_session_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT current_setting('request.headers', true)::json->>'x-anon-session-id';
$$;

-- INSERT: 過剰に許可されていたポリシーを削除
DROP POLICY IF EXISTS "Anyone can create jobs" ON generation_jobs;

-- UPDATE: 既存ポリシーを削除（名前のゆれに対応）
DROP POLICY IF EXISTS "Users can update their own jobs" ON generation_jobs;
DROP POLICY IF EXISTS "Users can update their own job status" ON generation_jobs;

-- SELECT / UPDATE: ヘルパーを (select ...) で参照し initPlan で1回だけ評価
DROP POLICY IF EXISTS "Users can view their own jobs" ON generation_jobs;
CREATE POLICY "Users can view their own jobs" 
ON generation_jobs FOR SELECT 
USING (anon_session_id::text = (select private.request_anon_session_id()));

CREATE POLICY "Users can update their own job status" 
ON generation_jobs FOR UPDATE 
USING (anon_session_id::text = (select private.request_anon_session_id()))
WITH CHECK (anon_session_id::text = (select private.request_anon_session_id()));
```

## 4. ストレージ設計 (Vercel Blob)

* **パス構造:**
  * `uploads/{anon_session_id}/{job_id}_raw.jpg`
  * `results/{anon_session_id}/{job_id}_icon.png`
* **ライフサイクル:**
  * 24時間経過後に自動削除。

## 5. リアルタイム・フロー

1. フロントエンドで `anon_session_id` を生成し、Supabaseの変更を購読。
2. NitroサーバーがGeminiで画像を生成し、Vercel Blobへ保存。
3. Supabaseのレコードを更新すると、フロントエンドへリアルタイム通知が飛ぶ。

## 6. 推奨DB選定

* **Supabase (PostgreSQL):** リアルタイム通信基盤として採用。
* **Vercel Blob:** エッジ配信に最適化された画像ストレージとして採用。

## 7. Realtime（Postgres Changes）の有効化

生成中画面でジョブの完了・失敗を即時に検知するには、`generation_jobs` を **Postgres Changes** 用の publication に含める必要があります。未設定の場合はポーリングで検知しますが、有効にするとレスポンスが速くなります。

### 方法A: ダッシュボードから（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) にログインし、対象プロジェクトを開く。
2. 左メニューで **Database** → **Publications** を開く。
3. **supabase_realtime** という publication を選択する（一覧にない場合は方法BのSQLで作成）。
4. テーブル一覧から **generation_jobs** にチェックを入れ、保存する。

> **注意:** ダッシュボードのメニュー名は **Replication** ではなく **Publications** です。Replication は別機能（データの外部複製）用です。

### 方法B: SQL Editor で実行（確実）

1. ダッシュボードで **SQL Editor** を開く。
2. 以下のいずれかを実行する。

**既に `supabase_realtime` が存在する場合（既存プロジェクトで他テーブルを既に Realtime に含めている場合）:**

```sql
-- generation_jobs を publication に追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
```

**初めて Realtime 用の publication を用意する場合:**

```sql
BEGIN;
-- 既存の supabase_realtime を削除（空の publication を作り直す場合のみ）
DROP PUBLICATION IF EXISTS supabase_realtime;
-- 空の publication を作成
CREATE PUBLICATION supabase_realtime;
COMMIT;

-- テーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
```

1. 実行後、フロントの `postgres_changes` 購読で `generation_jobs` の UPDATE が届くようになります。

### 参考

* [Subscribing to Database Changes \| Supabase Docs](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
* 本プロジェクトでは Realtime が届かない場合のフォールバックとして、生成中画面で約2.5秒ごとに `GET /api/jobs/:id` でジョブ状態をポーリングしています。
