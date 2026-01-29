import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core'

/**
 * Projects 資料表
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 10 }).notNull().unique(),
  description: varchar('description', { length: 1000 }),
  environments: text('environments').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})
