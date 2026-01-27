import { pgTable, uuid, text, timestamp, serial, integer, jsonb } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { Environment, IssueStatus } from '../../../shared/constants'
import type { Environment as EnvironmentType, IssueStatus as IssueStatusType, HttpMethod as HttpMethodType } from '../../../shared/constants'

/**
 * Issues 資料表
 */
export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  issueNumber: integer('issue_number').notNull(),
  projectKey: text('project_key').notNull(),

  // 基本資訊
  title: text('title').notNull(),
  description: text('description'),

  // API 請求資訊
  method: text('method').notNull().$type<HttpMethodType>(),
  url: text('url').notNull(),
  environment: text('environment').notNull().$type<EnvironmentType>().default(Environment.Dev),
  requestHeaders: jsonb('request_headers').$type<Record<string, string>>(),
  requestBody: jsonb('request_body'),

  // API 回應資訊
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),

  // 狀態管理
  status: text('status').notNull().$type<IssueStatusType>().default(IssueStatus.Open),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})
