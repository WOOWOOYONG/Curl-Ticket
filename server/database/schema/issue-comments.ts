import { pgTable, serial, integer, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { issues } from './issues'

export const issueComments = pgTable('issue_comments', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
}, table => [
  index('issue_comments_issue_id_idx').on(table.issueId),
  index('issue_comments_issue_created_idx').on(table.issueId, table.createdAt)
])
