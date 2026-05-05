/**
 * Read-only orphan check for FK candidate columns referencing profiles.id.
 * Helps decide RESTRICT / SET NULL / CASCADE and whether to clean up before adding FKs.
 *
 * Usage:
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
  console.error('❌ DATABASE_URL not found in .env')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

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
  console.log('🔍 Checking orphans (rows pointing to a missing profiles.id)...\n')

  // One round-trip per column, all 8 in parallel.
  const results = await Promise.all(
    checks.map(async ({ table, column, nullable }) => {
      const [{ table_total, orphan_total, top_missing }] = await sql`
        WITH orphans AS (
          SELECT ${sql(column)} AS missing_id
          FROM ${sql(table)}
          WHERE ${sql(column)} IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM profiles p
              WHERE p.id = ${sql(table)}.${sql(column)}
            )
        )
        SELECT
          (SELECT COUNT(*)::int FROM ${sql(table)}) AS table_total,
          (SELECT COUNT(*)::int FROM orphans) AS orphan_total,
          COALESCE(
            (SELECT json_agg(row_to_json(t)) FROM (
              SELECT missing_id, COUNT(*)::int AS count
              FROM orphans
              GROUP BY missing_id
              ORDER BY count DESC
              LIMIT 20
            ) t),
            '[]'::json
          ) AS top_missing
      `
      return { table, column, nullable, table_total, orphan_total, top_missing }
    })
  )

  for (const r of results) {
    const status = r.orphan_total === 0 ? '✅' : '⚠️'
    console.log(`${status} ${r.table}.${r.column} ${r.nullable ? '(nullable)' : '(not null)'}`)
    console.log(`   total rows: ${r.table_total}, orphan rows: ${r.orphan_total}`)
    if (r.orphan_total > 0) {
      console.log('   top missing IDs (up to 20):')
      for (const row of r.top_missing) {
        console.log(`     ${row.missing_id}  → ${row.count} row(s)`)
      }
    }
    console.log()
  }

  console.log('───────────────────────────────────')
  console.log('Summary:')
  console.log('───────────────────────────────────')
  for (const r of results) {
    const flag = r.orphan_total === 0 ? 'OK' : 'NEEDS ACTION'
    console.log(
      `  [${flag}] ${r.table}.${r.column}  orphans=${r.orphan_total} / total=${r.table_total}`
    )
  }

  const anyOrphan = results.some((r) => r.orphan_total > 0)
  if (anyOrphan) {
    console.log('\n⚠️  Orphans found. For each affected column, decide:')
    console.log('   1. delete the orphan rows')
    console.log('   2. backfill the missing profiles')
    console.log('   3. set the column nullable + ON DELETE SET NULL')
  } else {
    console.log('\n✅ No orphans — safe to add FK constraints')
  }
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
} finally {
  await sql.end()
}
