import { z } from 'zod'
import { environments, issueStatuses, httpMethods, issueTypes, Environment, IssueStatus, IssueType } from '../constants'

// ============================================
// Issue Schemas
// ============================================

/** Base fields shared by both issue types */
const issueBaseFields = {
  projectId: z.uuid(),
  title: z.string().min(1, '標題不可為空').max(200, '標題不可超過 200 字'),
  description: z.string().nullish(),
  status: z.enum(issueStatuses).default(IssueStatus.Open)
}

/** API Bug specific fields */
const apiBugFields = {
  issueType: z.literal(IssueType.ApiBug),
  rawCurl: z.string().nullish(),
  method: z.enum(httpMethods, { message: '無效的 HTTP 方法' }),
  url: z.string().min(1, 'URL 不可為空'),
  environment: z.enum(environments).default(Environment.Dev),
  requestHeaders: z.record(z.string(), z.string()).nullish(),
  requestBody: z.unknown().nullish(),
  responseStatus: z.number('無效的狀態碼').int().min(100, '無效的狀態碼').max(599, '無效的狀態碼').nullish(),
  responseBody: z.unknown().nullish()
}

/** Task specific fields */
const taskFields = {
  issueType: z.literal(IssueType.Task)
}

/** 新增 Issue (discriminated union) */
export const createIssueSchema = z.discriminatedUnion('issueType', [
  z.object({ ...issueBaseFields, ...apiBugFields }),
  z.object({ ...issueBaseFields, ...taskFields })
])

/** 更新 Issue — flat partial of all possible fields */
export const updateIssueSchema = z.object({
  title: z.string().min(1, '標題不可為空').max(200, '標題不可超過 200 字'),
  description: z.string().nullish(),
  rawCurl: z.string().nullish(),
  method: z.enum(httpMethods, { message: '無效的 HTTP 方法' }),
  url: z.string().min(1, 'URL 不可為空'),
  environment: z.enum(environments),
  requestHeaders: z.record(z.string(), z.string()).nullish(),
  requestBody: z.unknown().nullish(),
  responseStatus: z.number('無效的狀態碼').int().min(100, '無效的狀態碼').max(599, '無效的狀態碼').nullish(),
  responseBody: z.unknown().nullish(),
  status: z.enum(issueStatuses)
}).partial()

/** Issue 資料（完整） */
export const issueSchema = z.object({
  id: z.number().int(),
  projectId: z.uuid(),
  issueNumber: z.number().int(),
  projectKey: z.string(),
  issueType: z.enum(issueTypes),
  title: z.string(),
  description: z.string().nullable(),
  rawCurl: z.string().nullable(),
  method: z.enum(httpMethods).nullable(),
  url: z.string().nullable(),
  environment: z.enum(environments).nullable(),
  requestHeaders: z.record(z.string(), z.string()).nullable(),
  requestBody: z.unknown(),
  responseStatus: z.number().int().nullable(),
  responseBody: z.unknown(),
  status: z.enum(issueStatuses),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

/** Issue 列表項目（用於列表顯示） */
export const issueListItemSchema = issueSchema.pick({
  id: true,
  issueNumber: true,
  projectKey: true,
  issueType: true,
  title: true,
  method: true,
  url: true,
  environment: true,
  status: true,
  responseStatus: true,
  createdAt: true,
  updatedAt: true
})

// ============================================
// Types（從 Schema 推導）
// ============================================

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type CreateApiBugInput = z.infer<typeof createIssueSchema.options[0]>
export type CreateTaskInput = z.infer<typeof createIssueSchema.options[1]>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type Issue = z.infer<typeof issueSchema>
export type IssueListItem = z.infer<typeof issueListItemSchema>
