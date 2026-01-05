import { createClient } from '@supabase/supabase-js'
import type { Database } from '~~/shared/types/database.types'

/**
 * サーバーサイド用のSupabaseクライアントを取得する
 * @remark クライアント用のcomposable（useSupabase）はサーバーサイドでは動作しないため、専用の関数を使用
 * @remark rate_limitsテーブルへのアクセスが必要なため、service_role keyを使用（RLSをバイパス）
 * @returns {SupabaseClient<Database>} Supabaseクライアントインスタンス
 */
export function getSupabaseClient() {
  const config = useRuntimeConfig()

  const { public: { supabaseUrl, supabaseServiceRoleKey } } = config

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabaseの環境変数が設定されていません')
  }

  return createClient<Database>(
    supabaseUrl as string,
    supabaseServiceRoleKey as string
  )
}
