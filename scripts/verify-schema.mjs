import postgres from 'postgres'
import { readFileSync } from 'fs'

// 手動載入 .env
const env = readFileSync('.env', 'utf-8')
let DATABASE_URL = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (DATABASE_URL) {
  DATABASE_URL = DATABASE_URL.replace(/^["']|["']$/g, '')
}

const sql = postgres(DATABASE_URL)

try {
  console.log('📋 檢查資料表結構...\n')

  const columns = await sql`
    SELECT
      table_name,
      column_name,
      data_type,
      character_maximum_length,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT IN ('__drizzle_migrations')
    ORDER BY table_name, ordinal_position
  `

  let currentTable = ''
  for (const col of columns) {
    if (col.table_name !== currentTable) {
      currentTable = col.table_name
      console.log(`\n${currentTable.toUpperCase()}:`)
      console.log('─'.repeat(60))
    }

    const length = col.character_maximum_length ? `(${col.character_maximum_length})` : ''
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
    console.log(`  ${col.column_name.padEnd(20)} ${col.data_type}${length.padEnd(8)} ${nullable}`)
  }

  console.log('\n✅ Schema 驗證完成')
} catch (error) {
  console.error('❌ 錯誤:', error)
  process.exit(1)
} finally {
  await sql.end()
}
