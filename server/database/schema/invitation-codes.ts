import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core'

/**
 * Invitation Codes 資料表
 * 系統層級邀請碼，由 Admin 產生，新用戶需持碼才能註冊
 */
export const invitationCodes = pgTable('invitation_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 6 }).notNull().unique(),
  createdBy: uuid('created_by').notNull(),
  usedBy: uuid('used_by'),
  isUsed: boolean('is_used').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  usedAt: timestamp('used_at', { withTimezone: true })
}, table => [
  index('invitation_codes_code_idx').on(table.code),
  index('invitation_codes_is_used_idx').on(table.isUsed)
])
