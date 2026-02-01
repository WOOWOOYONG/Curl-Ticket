import { z } from 'zod'
import { environments } from '../constants'

// ============================================
// Project Schemas
// ============================================

/** 新增專案 */
export const createProjectSchema = z.object({
  name: z.string().min(1, '專案名稱不可為空').max(100, '專案名稱不可超過 100 字'),
  key: z
    .string()
    .min(2, '專案代號至少 2 個字元')
    .max(10, '專案代號不可超過 10 個字元')
    .regex(/^[A-Z0-9]+$/, '專案代號只能包含大寫字母和數字'),
  description: z.string().nullish(),
  environments: z.array(z.enum(environments as [string, ...string[]])).min(1, '請至少選擇一個環境')
})

/** 更新專案 */
export const updateProjectSchema = createProjectSchema.partial()

/** 專案資料（完整） */
export const projectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  environments: z.array(z.string()),
  createdAt: z.coerce.date()
})

/** 專案資料（含統計） */
export const projectWithStatsSchema = projectSchema.extend({
  totalIssues: z.number(),
  openIssues: z.number()
})

// ============================================
// Types（從 Schema 推導）
// ============================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type Project = z.infer<typeof projectSchema>
export type ProjectWithStats = z.infer<typeof projectWithStatsSchema>
