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
