import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { InvitationStatus } from '../../../shared/constants'

/**
 * Project Invitations 資料表
 * 專案層級邀請，由專案 Owner 發出，邀請已註冊用戶加入專案
 */
export const projectInvitations = pgTable('project_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  invitedBy: uuid('invited_by').notNull(),
  status: varchar('status', { length: 20 }).notNull().default(InvitationStatus.Pending),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true })
}, table => [
  index('project_invitations_project_id_idx').on(table.projectId),
  index('project_invitations_email_idx').on(table.email),
  index('project_invitations_status_idx').on(table.status)
])
