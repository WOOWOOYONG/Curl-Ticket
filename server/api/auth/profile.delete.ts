import { eq } from 'drizzle-orm'
import {
  apiTokens,
  deviceCodes,
  notifications,
  profiles,
  projectMembers,
  projects
} from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'
import { buildOwnedActiveProjectCondition } from '~~/server/utils/project-access'

/**
 * DELETE /api/auth/profile
 * 軟刪除目前登入用戶的帳號
 * - 若用戶仍擁有專案，回傳 400 要求先轉移或刪除
 * - 軟刪除 profile（設定 deletedAt）
 * - 清理活躍資源（成員、通知、API tokens、device codes）
 */
export default defineEventHandler(async (event) => {
  const userId = event.context.userId as string
  const db = useDB()

  // 檢查是否擁有專案
  const ownedProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(buildOwnedActiveProjectCondition(userId))

  if (ownedProjects.length > 0) {
    badRequest('Please transfer or delete owned projects first', {
      ownedProjects: ownedProjects.map((p) => ({ id: p.id, name: p.name }))
    })
  }

  // 清理活躍資源（先清理再軟刪除，避免中途失敗導致不一致）
  await Promise.all([
    db.delete(projectMembers).where(eq(projectMembers.userId, userId)),
    db.delete(notifications).where(eq(notifications.userId, userId)),
    db.delete(apiTokens).where(eq(apiTokens.userId, userId)),
    db.delete(deviceCodes).where(eq(deviceCodes.userId, userId))
  ])

  // 軟刪除 profile
  await db.update(profiles).set({ deletedAt: new Date() }).where(eq(profiles.id, userId))

  return { success: true }
})
