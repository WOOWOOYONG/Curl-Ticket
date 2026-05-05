import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { profiles } from './profiles'

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
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    tokenPlaintext: text('token_plaintext'), // 暫存明碼 token，CLI 取用一次後清除
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    // FK index：加速 user_id 的 CASCADE 查詢
    index('device_codes_user_id_idx')
      .on(table.userId)
      .where(sql`${table.userId} is not null`)
  ]
)
