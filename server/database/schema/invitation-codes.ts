import { sql } from 'drizzle-orm'
import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { profiles } from './profiles'

/**
 * Invitation Codes 資料表
 * 系統層級邀請碼，由 Admin 產生，新用戶需持碼才能註冊
 */
export const invitationCodes = pgTable(
  'invitation_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 6 }).notNull().unique(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    usedBy: uuid('used_by').references(() => profiles.id, { onDelete: 'set null' }),
    isUsed: boolean('is_used').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    usedAt: timestamp('used_at', { withTimezone: true })
  },
  (table) => [
    index('invitation_codes_is_used_idx').on(table.isUsed),
    // FK index：加速 used_by 的 SET NULL cascade 查詢
    index('invitation_codes_used_by_idx')
      .on(table.usedBy)
      .where(sql`${table.usedBy} is not null`)
  ]
)
