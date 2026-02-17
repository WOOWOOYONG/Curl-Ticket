import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    root: '.',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['shared/**/*.ts', 'server/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'server/database/migrations/**']
    }
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '~~': resolve(__dirname, '.'),
      '~~/': resolve(__dirname, './'),
      '#imports': resolve(__dirname, './.nuxt/imports.d.ts')
    }
  }
})
