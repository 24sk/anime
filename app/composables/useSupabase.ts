import type { Database } from '~~/shared/types/database.types'

export const useSupabase = () => {
  // @nuxtjs/supabaseモジュールが提供するコンポーザブルを使用
  const supabase = useSupabaseClient<Database>()
  return supabase
}
