/**
 * 孤兒資料檢查腳本（read-only）
 *
 * 在 PR 2「補 Foreign Key 約束」之前，列出每一個目標欄位中
 * 找不到對應 profiles.id 的資料列，幫助決定每個 FK 該用
 * RESTRICT / SET NULL / CASCADE，以及是否需要先清理資料。
 *
 * 用法：
 *   node scripts/check-orphans.mjs
 */
import postgres from 'postgres'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf-8')
let DATABASE_URL = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (DATABASE_URL) {
  DATABASE_URL = DATABASE_URL.replace(/^["']|["']$/g, '')
}

if (!DATABASE_URL) {
  console.error('❌ 找不到 DATABASE_URL，請確認 .env')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

/**
 * 待檢查的欄位清單。
 * - nullable=true 表示該欄位本身允許 NULL（NULL 不算孤兒）
 */
const checks = [
  { table: 'projects', column: 'owner_id', nullable: false },
  { table: 'issues', column: 'created_by', nullable: false },
  { table: 'issue_comments', column: 'author_id', nullable: false },
  { table: 'notifications', column: 'user_id', nullable: false },
  { table: 'project_invitations', column: 'invited_by', nullable: false },
  { table: 'invitation_codes', column: 'created_by', nullable: false },
  { table: 'invitation_codes', column: 'used_by', nullable: true },
  { table: 'device_codes', column: 'user_id', nullable: true }
]

try {
  console.log('🔍 檢查孤兒資料（指向不存在的 profiles.id）...\n')

  const summary = []

  for (const { table, column, nullable } of checks) {
    // 找出非 NULL 但找不到對應 profile 的列
    const orphans = await sql`
      SELECT ${sql(column)} AS missing_id, COUNT(*) AS count
      FROM ${sql(table)}
      WHERE ${sql(column)} IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = ${sql(table)}.${sql(column)}
        )
      GROUP BY ${sql(column)}
      ORDER BY count DESC
      LIMIT 20
    `

    const totalQuery = await sql`
      SELECT COUNT(*) AS count
      FROM ${sql(table)}
      WHERE ${sql(column)} IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = ${sql(table)}.${sql(column)}
        )
    `
    const totalOrphans = Number(totalQuery[0].count)

    const tableTotalQuery = await sql`SELECT COUNT(*) AS count FROM ${sql(table)}`
    const tableTotal = Number(tableTotalQuery[0].count)

    const status = totalOrphans === 0 ? '✅' : '⚠️'
    console.log(`${status} ${table}.${column} ${nullable ? '(nullable)' : '(not null)'}`)
    console.log(`   total rows: ${tableTotal}, orphan rows: ${totalOrphans}`)
    if (totalOrphans > 0) {
      console.log(`   top missing IDs (up to 20):`)
      for (const row of orphans) {
        console.log(`     ${row.missing_id}  → ${row.count} row(s)`)
      }
    }
    console.log()

    summary.push({ table, column, nullable, totalOrphans, tableTotal })
  }

  console.log('───────────────────────────────────')
  console.log('Summary:')
  console.log('───────────────────────────────────')
  for (const s of summary) {
    const flag = s.totalOrphans === 0 ? 'OK' : 'NEEDS ACTION'
    console.log(
      `  [${flag}] ${s.table}.${s.column}  orphans=${s.totalOrphans} / total=${s.tableTotal}`
    )
  }

  const anyOrphan = summary.some((s) => s.totalOrphans > 0)
  if (anyOrphan) {
    console.log('\n⚠️  發現孤兒資料。請決定每個欄位是否：')
    console.log('   1. 刪除孤兒列')
    console.log('   2. 補上對應 profile')
    console.log('   3. 把欄位改成 nullable + ON DELETE SET NULL')
  } else {
    console.log('\n✅ 沒有孤兒資料，可以安全加 FK 約束')
  }
} catch (error) {
  console.error('❌ 錯誤:', error)
  process.exit(1)
} finally {
  await sql.end()
}
