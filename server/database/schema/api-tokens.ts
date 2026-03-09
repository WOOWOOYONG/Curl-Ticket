import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { profiles } from './profiles'

/**
 * API Tokens 資料表
 * 儲存 CLI/外部整合用的 Bearer Token（明碼不入庫，只存 SHA-256 hash）
 */
export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(),
  prefix: text('prefix').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, table => [
  index('api_tokens_user_id_idx').on(table.userId),
  index('api_tokens_token_hash_idx').on(table.tokenHash)
])
