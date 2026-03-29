import { pgTable, uuid, text, varchar, timestamp, index } from 'drizzle-orm/pg-core'

/**
 * Device Codes 資料表
 * 用於 CLI Device Code Flow 登入
 */
export const deviceCodes = pgTable(
  'device_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceCode: text('device_code').unique().notNull(),
    userCode: varchar('user_code', { length: 9 }).unique().notNull(),
    userId: uuid('user_id'),
    tokenPlaintext: text('token_plaintext'), // 暫存明碼 token，CLI 取用一次後清除
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('device_codes_device_code_idx').on(table.deviceCode),
    index('device_codes_user_code_idx').on(table.userCode)
  ]
)
