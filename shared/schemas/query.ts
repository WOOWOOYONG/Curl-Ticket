import { z } from 'zod'
import { issueStatuses, environments, issueTypes, httpMethods } from '../constants'

// ============================================
// Pagination
// ============================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

// ============================================
// Issue Query
// ============================================

export const issueQuerySchema = paginationQuerySchema.extend({
  status: z.enum(issueStatuses).optional(),
  environment: z.enum(environments).optional(),
  issueType: z.enum(issueTypes).optional(),
  method: z.enum(httpMethods).optional(),
  search: z.string().optional(),
  issueNumber: z.coerce.number().int().min(1).optional(),
  assigneeId: z.union([z.uuid(), z.literal('null')]).optional()
})

// ============================================
// Project Query
// ============================================

export const projectQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().optional()
  })
  .extend({
    pageSize: z.coerce.number().int().min(1).max(100).default(12)
  })

// ============================================
// Types
// ============================================

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type IssueQuery = z.infer<typeof issueQuerySchema>
export type ProjectQuery = z.infer<typeof projectQuerySchema>
