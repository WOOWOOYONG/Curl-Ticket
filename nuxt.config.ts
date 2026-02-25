// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase', '@vueuse/nuxt'],

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

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production'
    },
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/api/*']
    }
  }
})
