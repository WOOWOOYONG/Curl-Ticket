import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, varchar, timestamp, serial, integer, jsonb, index, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { Environment, IssueStatus, IssueType } from '../../../shared/constants'
import type { Environment as EnvironmentType, IssueStatus as IssueStatusType, HttpMethod as HttpMethodType, IssueType as IssueTypeType } from '../../../shared/constants'

/**
 * Issues 資料表
 */
export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  issueNumber: integer('issue_number').notNull(),
  projectKey: varchar('project_key', { length: 10 }).notNull(),

  // Issue 類型
  issueType: varchar('issue_type', { length: 20 }).notNull().$type<IssueTypeType>().default(IssueType.ApiBug),

  // 基本資訊
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  rawCurl: text('raw_curl'),

  // API 請求資訊（nullable for Task type）
  method: varchar('method', { length: 10 }).$type<HttpMethodType>(),
  url: text('url'),
  environment: varchar('environment', { length: 10 }).$type<EnvironmentType>().default(Environment.Dev),
  requestHeaders: jsonb('request_headers').$type<Record<string, string>>(),
  requestBody: jsonb('request_body'),

  // API 回應資訊
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),

  // 狀態管理
  status: varchar('status', { length: 20 }).notNull().$type<IssueStatusType>().default(IssueStatus.Open),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, table => [
  check('issues_status_check', sql`${table.status} in ('Open', 'In Progress', 'Done', 'Close')`),
  check('issues_type_check', sql`${table.issueType} in ('api_bug', 'task')`),
  // 複合索引：加速「找特定專案的 issues」和「統計計算」
  // 包含 projectId, status, updatedAt 三個欄位
  index('issues_project_stats_idx')
    .on(table.projectId, table.status, table.updatedAt),
  uniqueIndex('issues_project_issue_number_key')
    .on(table.projectId, table.issueNumber),
  // 複合索引：加速 Issue 列表查詢（projectId + issueType 過濾 + createdAt 排序）
  index('issues_project_list_idx')
    .on(table.projectId, table.issueType, table.createdAt)
])
