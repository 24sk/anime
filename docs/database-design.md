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

### ② `rate_limits` (利用制限管理)

APIコスト保護のため、IPアドレス単位でのリクエスト回数を管理します。

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `ip_hash` | Text | PK | ユーザーIPをハッシュ化したもの |
| `request_count` | Integer | Default: 1 | 指定期間内の累計リクエスト数 |
| `last_request_at` | Timestamptz | Default: now() | 最終リクエスト日時 |

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

-- 3. インデックス作成
CREATE INDEX idx_jobs_session_id ON generation_jobs(anon_session_id);

-- 4. RLSの有効化
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- 5. セキュリティポリシー定義
-- 参照: ヘッダーに付与された session_id と一致するレコードのみ参照可能
CREATE POLICY "Users can view their own jobs" 
ON generation_jobs FOR SELECT 
USING (anon_session_id::text = current_setting('request.headers')::json->>'x-anon-session-id');

-- 追加: 生成リクエストは誰でも可能
CREATE POLICY "Anyone can create jobs" 
ON generation_jobs FOR INSERT 
WITH CHECK (true);

-- 更新: 自分のセッションに紐づく広告フラグのみ更新可能
CREATE POLICY "Users can update their own job status" 
ON generation_jobs FOR UPDATE 
USING (anon_session_id::text = current_setting('request.headers')::json->>'x-anon-session-id');

-- 6. レートリミット管理用テーブル
CREATE TABLE IF NOT EXISTS rate_limits (
    ip_hash TEXT PRIMARY KEY,
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMPTZ DEFAULT now()
);
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
