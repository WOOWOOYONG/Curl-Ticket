import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Projects 資料表
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})
