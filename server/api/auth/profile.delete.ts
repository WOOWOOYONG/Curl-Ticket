import { eq } from 'drizzle-orm'
import { serverSupabaseServiceRole } from '#supabase/server'
import { profiles, projects } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'

/**
 * DELETE /api/auth/profile
 * 刪除目前登入用戶的帳號
 * - 若用戶仍擁有專案，回傳 400 要求先轉移或刪除
 * - 刪除 profile 記錄 + Supabase auth user
 */
export default defineEventHandler(async (event) => {
  const userId = event.context.userId as string
  const db = useDB()

  // 檢查是否擁有專案
  const ownedProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.ownerId, userId))

  if (ownedProjects.length > 0) {
    badRequest('Please transfer or delete owned projects first', {
      ownedProjects: ownedProjects.map(p => ({ id: p.id, name: p.name }))
    })
  }

  // 刪除 profile 記錄
  await db.delete(profiles).where(eq(profiles.id, userId))

  // 刪除 Supabase auth user
  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Failed to delete Supabase auth user:', error.message)
  }

  return { success: true }
})
