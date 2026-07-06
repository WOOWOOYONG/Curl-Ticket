import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { profiles } from './profiles'
import { projects } from './projects'
import { InvitationStatus } from '../../../shared/constants'

/**
 * Project Invitations 資料表
 * 專案層級邀請，由專案 Owner 發出，邀請已註冊用戶加入專案
 */
export const projectInvitations = pgTable(
  'project_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 })
      .notNull()
      .$type<InvitationStatus>()
      .default(InvitationStatus.Pending),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
  },
  (table) => [
    index('project_invitations_project_id_idx').on(table.projectId),
    index('project_invitations_email_idx').on(table.email),
    index('project_invitations_status_idx').on(table.status),
    // 同一專案 + email 至多一筆 pending 邀請，防併發產生重複 pending
    uniqueIndex('project_invitations_pending_unique_idx')
      .on(table.projectId, table.email)
      .where(sql`${table.status} = 'pending'`)
  ]
)
