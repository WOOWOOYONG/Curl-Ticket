import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  // 設定 Supabase 專用選項
  schemaFilter: ['public'],
  verbose: true,
  strict: true
})
