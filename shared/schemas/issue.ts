import { z } from 'zod'
import { environments, issueStatuses, httpMethods, Environment, IssueStatus } from '../constants'

// ============================================
// Issue Schemas
// ============================================

/** 新增 Issue */
export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, '標題不可為空').max(200, '標題不可超過 200 字'),
  description: z.string().nullish(),
  method: z.enum(httpMethods, { message: '無效的 HTTP 方法' }),
  url: z.string().min(1, 'URL 不可為空'),
  environment: z.enum(environments).default(Environment.Dev),
  requestHeaders: z.record(z.string(), z.string()).nullish(),
  requestBody: z.unknown().nullish(),
  responseStatus: z.number().int().min(100).max(599).nullish(),
  responseBody: z.unknown().nullish(),
  status: z.enum(issueStatuses).default(IssueStatus.Open)
})

/** 更新 Issue */
export const updateIssueSchema = createIssueSchema
  .omit({ projectId: true })
  .partial()

/** Issue 資料（完整） */
export const issueSchema = z.object({
  id: z.number().int(),
  projectId: z.string().uuid(),
  issueNumber: z.number().int(),
  projectKey: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  method: z.enum(httpMethods),
  url: z.string(),
  environment: z.enum(environments),
  requestHeaders: z.record(z.string(), z.string()).nullable(),
  requestBody: z.unknown(),
  responseStatus: z.number().int().nullable(),
  responseBody: z.unknown(),
  status: z.enum(issueStatuses),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

// ============================================
// Types（從 Schema 推導）
// ============================================

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type Issue = z.infer<typeof issueSchema>
