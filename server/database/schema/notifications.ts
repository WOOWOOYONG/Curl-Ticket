import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { issues } from './issues'

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // FK to auth.users (接收通知的人)
  issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  content: text('content'),
  isRead: boolean('is_read').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Types
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
