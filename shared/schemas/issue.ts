import { z } from 'zod'
import {
  environments,
  issueStatuses,
  httpMethods,
  issueTypes,
  Environment,
  IssueStatus,
  IssueType
} from '../constants'

// ============================================
// Issue Schemas
// ============================================

/** Base fields shared by both issue types */
const issueBaseFields = {
  projectId: z.uuid(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().nullish(),
  status: z.enum(issueStatuses).default(IssueStatus.Open),
  assigneeId: z.uuid().nullish()
}

/** API Bug specific fields */
const apiBugFields = {
  issueType: z.literal(IssueType.ApiBug),
  rawCurl: z.string().nullish(),
  method: z.enum(httpMethods, { message: 'Invalid HTTP method' }),
  url: z.string().min(1, 'URL is required'),
  environment: z.enum(environments).default(Environment.Dev),
  requestHeaders: z.record(z.string(), z.string()).nullish(),
  requestBody: z.unknown().nullish(),
  responseStatus: z
    .number('Invalid status code')
    .int()
    .min(100, 'Invalid status code')
    .max(599, 'Invalid status code')
    .nullish(),
  responseBody: z.unknown().nullish()
}

/** Task specific fields */
const taskFields = {
  issueType: z.literal(IssueType.Task)
}

// ============================================
// Derived Constants & Helpers
// ============================================

/**
 * Field names that only exist on ApiBug issues (excludes the `issueType` discriminator).
 * Single source of truth — POST route, PATCH route, and update schema all derive from this.
 */
export const API_BUG_ONLY_FIELDS = Object.keys(apiBugFields).filter(
  (k): k is Exclude<keyof typeof apiBugFields, 'issueType'> => k !== 'issueType'
)

export type ApiBugOnlyField = (typeof API_BUG_ONLY_FIELDS)[number]

/**
 * Returns { rawCurl: null, method: null, ... } for all API-only fields.
 * Used when creating Task issues to explicitly null out API columns.
 */
export function nullifyApiBugFields(): Record<ApiBugOnlyField, null> {
  return Object.fromEntries(API_BUG_ONLY_FIELDS.map((field) => [field, null])) as Record<
    ApiBugOnlyField,
    null
  >
}

/**
 * Extracts API-only fields from a validated ApiBug input, coalescing undefined to null.
 */
export function pickApiBugFields(
  data: CreateApiBugInput
): Pick<CreateApiBugInput, ApiBugOnlyField> {
  return Object.fromEntries(
    API_BUG_ONLY_FIELDS.map((field) => [field, data[field] ?? null])
  ) as Pick<CreateApiBugInput, ApiBugOnlyField>
}

// ============================================
// Schemas
// ============================================

/** 新增 Issue (discriminated union) */
export const createIssueSchema = z.discriminatedUnion('issueType', [
  z.object({ ...issueBaseFields, ...apiBugFields }),
  z.object({ ...issueBaseFields, ...taskFields })
])

/** 前端表單用 schema（omit projectId + issueType，這兩個由程式邏輯決定） */
export const createApiBugFormSchema = z
  .object({ ...issueBaseFields, ...apiBugFields })
  .omit({ projectId: true, issueType: true })
export const createTaskFormSchema = z
  .object({ ...issueBaseFields, ...taskFields })
  .omit({ projectId: true, issueType: true })

/** Base fields for update (no defaults, so .partial() works correctly) */
const issueBaseUpdateFields = {
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().nullish(),
  status: z.enum(issueStatuses),
  assigneeId: z.uuid().nullish()
}

/** API Bug update fields — derived from apiBugFields, excluding issueType discriminator.
 *  Defaults are stripped so PATCH only includes explicitly sent fields. */
const apiBugUpdateFields = Object.fromEntries(
  API_BUG_ONLY_FIELDS.map((field) => {
    const schema = apiBugFields[field]
    return [field, schema instanceof z.ZodDefault ? schema.removeDefault() : schema]
  })
) as unknown as { [K in ApiBugOnlyField]: (typeof apiBugFields)[K] }

/** 更新 Issue — flat partial, API fields derived from apiBugFields */
export const updateIssueSchema = z
  .object({
    ...issueBaseUpdateFields,
    ...apiBugUpdateFields
  })
  .partial()

/** Assignee profile summary attached to issue responses */
export const assigneeSummarySchema = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
  email: z.email()
})

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
  assigneeId: z.uuid().nullable(),
  assignee: assigneeSummarySchema.nullable(),
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
  assigneeId: true,
  assignee: true,
  createdAt: true,
  updatedAt: true
})

// ============================================
// Types（從 Schema 推導）
// ============================================

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type CreateApiBugInput = z.infer<(typeof createIssueSchema.options)[0]>
export type CreateTaskInput = z.infer<(typeof createIssueSchema.options)[1]>
export type CreateApiBugFormInput = z.infer<typeof createApiBugFormSchema>
export type CreateTaskFormInput = z.infer<typeof createTaskFormSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type Issue = z.infer<typeof issueSchema>
export type IssueListItem = z.infer<typeof issueListItemSchema>
export type AssigneeSummary = z.infer<typeof assigneeSummarySchema>
