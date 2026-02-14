import { eq } from 'drizzle-orm'
import { projects } from '~~/server/database/schema'
import { badRequest, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)

  if (project.ownerId !== userId) {
    forbidden('Only the project owner can delete this project')
  }

  // TODO: 改為軟刪除 — 在 projects 表新增 deletedAt 欄位，
  // 將 DELETE 改為 UPDATE SET deleted_at = NOW()，
  // 並在 project-access.ts 和 projects/index.get.ts 加上 deletedAt IS NULL 過濾
  await db.delete(projects).where(eq(projects.id, projectId))

  return { success: true }
})
