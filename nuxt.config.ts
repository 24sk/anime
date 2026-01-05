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
      // 公開可能な設定
      supabaseUrl: '' // NUXT_PUBLIC_SUPABASE_URL を自動で読み込み（公開情報）
      // クライアント側でSupabaseを使用する場合は、@nuxtjs/supabaseモジュールが自動的にanon keyを設定します
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

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
  supabase: { redirect: false }
})
