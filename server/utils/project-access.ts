import { and, eq, or, sql } from 'drizzle-orm'
import type { useDB } from '~~/server/utils/db'
import { projectMembers, projects } from '~~/server/database/schema'
import { notFound } from '~~/server/utils/errors'

/**
 * 建立「使用者是否為專案成員」的 EXISTS SQL 條件。
 * 這個條件會在外層 projects 查詢中以關聯子查詢方式執行。
 *
 * @param userId - 目前登入使用者 ID
 * @returns Drizzle SQL boolean expression
 */
function buildMemberExistsCondition(userId: string) {
  return sql<boolean>`exists (
    select 1
    from ${projectMembers}
    where ${projectMembers.projectId} = ${projects.id}
      and ${projectMembers.userId} = ${userId}
  )`
}

/**
 * 建立專案可見性條件：
 * - 使用者是專案 owner，或
 * - 使用者存在於 project_members
 *
 * @param userId - 目前登入使用者 ID
 * @returns 可用於 where() 的授權條件
 */
export function buildProjectAccessCondition(userId: string) {
  return or(
    eq(projects.ownerId, userId),
    buildMemberExistsCondition(userId)
  )!
}

/**
 * 取得使用者可存取的專案資料。
 * 若專案不存在或使用者無權限，會拋出 404 錯誤。
 *
 * @param db - Drizzle 資料庫實例
 * @param projectId - 目標專案 ID
 * @param userId - 目前登入使用者 ID
 * @returns 使用者可存取的專案資料
 * @throws H3Error 404 Project not found
 */
export async function getAccessibleProject(
  db: ReturnType<typeof useDB>,
  projectId: string,
  userId: string
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        buildProjectAccessCondition(userId)
      )
    )
    .limit(1)

  if (!project) {
    notFound('Project not found')
  }

  return project
}
