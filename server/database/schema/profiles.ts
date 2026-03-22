import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core'

/**
 * Profiles 資料表
 * 對應 Supabase auth.users，追蹤用戶角色與基本資訊
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // 對應 Supabase auth.users.id（非自動產生）
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, table => [
  index('profiles_email_idx').on(table.email),
  index('profiles_role_idx').on(table.role),
  index('profiles_deleted_at_idx').on(table.deletedAt)
])
