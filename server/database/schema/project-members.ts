import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, table => [
  primaryKey({ name: 'project_members_pkey', columns: [table.projectId, table.userId] }),
  index('project_members_user_id_idx').on(table.userId)
])
