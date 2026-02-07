// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxtjs/supabase',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt'
  ],

  components: [
    { path: '~/components', pathPrefix: false }
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // サーバーサイドでのみアクセス可能（セキュリティ確保）
    geminiApiKey: '', // NUXT_GEMINI_API_KEY を自動で読み込み
    blobReadWriteToken: '', // NUXT_BLOB_READ_WRITE_TOKEN を自動で読み込み
    supabaseServiceRoleKey: '', // NUXT_SUPABASE_SERVICE_ROLE_KEY を自動で読み込み（RLSをバイパスするため、サーバー側のみ）

    public: {
      supabaseUrl: '' // NUXT_PUBLIC_SUPABASE_URL を自動で読み込み（公開情報）
      // クライアント側でSupabaseを使用する場合は、@nuxtjs/supabaseモジュールが自動的にanon keyを設定します
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      wasm: true
    }
  },

  // Supabase の node_modules 内の未使用インポート警告を抑制（ライブラリ側のため当プロジェクトでは修正不可）
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (!warning) {
            warn(warning)
            return
          }
          const source = (warning as { source?: string }).source
          if (
            warning.code === 'UNUSED_EXTERNAL_IMPORT'
            && typeof source === 'string'
            && source.includes('@supabase')
          ) {
            return
          }
          warn(warning)
        }
      }
    }
  },

  hooks: {
    // Nitro の Rollup ビルドで Supabase の未使用インポート警告を抑制（rollupConfig 構築後に onwarn を上書き）
    'nitro:build:before'(nitro) {
      nitro.hooks.hook('rollup:before', (_nitro, rollupConfig) => {
        const defaultOnwarn = rollupConfig.onwarn
        // Nitro の Rollup 型と互換させるため、内部で unknown として扱い最後に型アサーション
        rollupConfig.onwarn = ((warning: unknown, defaultHandler: (w: unknown) => void) => {
          const w = warning as { code?: string, source?: string, message?: string }
          const msg = String(w.message ?? '')
          const src = String(w.source ?? '')
          const isSupabaseUnusedImport
            = (w.code === 'UNUSED_EXTERNAL_IMPORT' || msg.includes('imported from external module'))
              && (src.includes('supabase') || msg.includes('supabase'))
          if (isSupabaseUnusedImport) {
            return
          }
          if (defaultOnwarn) {
            (defaultOnwarn as (warning: unknown, defaultHandler: (w: unknown) => void) => void).call(rollupConfig, warning, defaultHandler)
          } else {
            defaultHandler(warning)
          }
        }) as typeof rollupConfig.onwarn
      })
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  googleFonts: {
    families: {
      'Noto+Sans+JP': [400, 700],
      'Quicksand': [600, 700] // ロゴや見出し用
    },
    display: 'swap',
    preload: true,
    download: true
  },
  // データベース型は shared/types/database.types.ts に配置（Supabase CLIで生成）
  supabase: {
    redirect: false,
    types: '~~/shared/types/database.types.ts'
  }
})
