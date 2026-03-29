import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core'

/**
 * Projects 資料表
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    key: varchar('key', { length: 10 }).notNull().unique(),
    description: varchar('description', { length: 1000 }),
    environments: text('environments').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    // 索引：加速「按建立時間排序」的查詢（最新的專案排在前面）
    index('projects_created_at_idx').on(table.createdAt.desc())
  ]
)
