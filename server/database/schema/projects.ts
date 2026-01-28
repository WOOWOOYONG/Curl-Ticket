import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

/**
 * Projects 資料表
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 10 }).notNull().unique(),
  description: varchar('description', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})
