// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/supabase', '@vueuse/nuxt', '@nuxtjs/i18n'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // 僅在 server 端可用
    databaseUrl: process.env.DATABASE_URL,
    devLoginEmail: process.env.DEV_LOGIN_EMAIL,
    devLoginPassword: process.env.DEV_LOGIN_PASSWORD,
    devLoginKey: process.env.DEV_LOGIN_KEY
  },

  routeRules: {},

  compatibilityDate: '2025-01-15',

  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' }
    ],
    strategy: 'no_prefix',
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'en',
      alwaysRedirect: false,
      redirectOn: 'root'
    }
  },

  supabase: {
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production'
    },
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/api/*', '/share/*']
    }
  }
})
