import { pgTable, uuid, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { issues } from './issues'
import { projectInvitations } from './project-invitations'
import type { NotificationType } from '~~/shared/constants'

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // FK to auth.users (接收通知的人)
  issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }),

  type: varchar('type', { length: 30 }).notNull().$type<NotificationType>().default('issue_update'),
  projectInvitationId: uuid('project_invitation_id').references(() => projectInvitations.id, {
    onDelete: 'cascade'
  }),

  title: varchar('title', { length: 200 }).notNull(),
  content: varchar('content', { length: 1000 }),
  isRead: boolean('is_read').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Types
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
