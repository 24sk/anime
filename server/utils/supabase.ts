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
  // supabaseUrl は public、supabaseServiceRoleKey はサーバー専用（runtimeConfig 直下）
  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseServiceRoleKey = config.supabaseServiceRoleKey as string

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabaseの環境変数が設定されていません')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey)
}
