import { z } from 'zod'
import { environments } from '../constants'

// ============================================
// Project Schemas
// ============================================

/** 新增專案 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(10, 'Project key must be 10 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Project key can only contain uppercase letters and numbers'),
  description: z.string().nullish(),
  environments: z.array(z.enum(environments)).min(1, 'Please select at least one environment')
})

export const editableProjectSchema = createProjectSchema.pick({
  name: true,
  description: true,
  environments: true
})

/** 更新專案 */
export const updateProjectSchema = editableProjectSchema.partial().strict()

/** 專案資料（完整） */
export const projectSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  environments: z.array(z.enum(environments)),
  createdAt: z.coerce.date()
})

/** 專案資料（含統計） */
export const projectWithStatsSchema = projectSchema.extend({
  totalIssues: z.number(),
  openIssues: z.number()
})

/** 專案成員資料 */
export const projectMemberSchema = z.object({
  userId: z.uuid(),
  createdAt: z.coerce.date(),
  name: z.string().nullable(),
  email: z.string().nullable()
})

// ============================================
// Types（從 Schema 推導）
// ============================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type EditableProjectInput = z.infer<typeof editableProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type Project = z.infer<typeof projectSchema>
export type ProjectWithStats = z.infer<typeof projectWithStatsSchema>
export type ProjectMember = z.infer<typeof projectMemberSchema>
