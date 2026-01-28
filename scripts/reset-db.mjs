import postgres from 'postgres'
import { readFileSync } from 'fs'

// 手動載入 .env
const env = readFileSync('.env', 'utf-8')
let DATABASE_URL = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
// 移除前後的引號
if (DATABASE_URL) {
  DATABASE_URL = DATABASE_URL.replace(/^["']|["']$/g, '')
}

if (!DATABASE_URL) {
  console.error('❌ 找不到 DATABASE_URL')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

try {
  console.log('🗑️  刪除舊資料表...')

  // 刪除資料表（按照依賴順序）
  await sql`DROP TABLE IF EXISTS notifications CASCADE`
  await sql`DROP TABLE IF EXISTS issues CASCADE`
  await sql`DROP TABLE IF EXISTS projects CASCADE`

  console.log('✅ 資料表已刪除')

  // 刪除 migration 記錄表
  await sql`DROP TABLE IF EXISTS __drizzle_migrations CASCADE`
  console.log('✅ Migration 記錄已清除')

  console.log('\n現在可以執行: pnpm db:migrate')
} catch (error) {
  console.error('❌ 錯誤:', error)
  process.exit(1)
} finally {
  await sql.end()
}
