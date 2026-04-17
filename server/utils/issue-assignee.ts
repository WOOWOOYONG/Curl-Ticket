import { and, eq, isNull, or, sql } from 'drizzle-orm'
import type { useDB } from '~~/server/utils/db'
import { profiles, projectMembers, projects } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'

/**
 * 驗證 assigneeId 是該專案的 owner 或 member。
 * - null / undefined：放行（Unassigned）
 * - 否則必須匹配 projects.ownerId 或存在於 project_members
 */
export async function assertAssigneeAllowed(
  db: ReturnType<typeof useDB>,
  projectId: string,
  assigneeId: string | null | undefined
) {
  if (assigneeId == null) return

  const [allowed] = await db
    .select({ ok: sql<number>`1` })
    .from(projects)
    .leftJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, assigneeId))
    )
    .where(
      and(
        eq(projects.id, projectId),
        or(eq(projects.ownerId, assigneeId), eq(projectMembers.userId, assigneeId))
      )
    )
    .limit(1)

  if (!allowed) {
    badRequest('Assignee must be a member or owner of this project')
  }
}

/**
 * 取得「非軟刪除」的 profile summary，供 issue response 組合 assignee。
 */
export async function getAssigneeSummary(db: ReturnType<typeof useDB>, assigneeId: string | null) {
  if (!assigneeId) return null

  const [row] = await db
    .select({ id: profiles.id, name: profiles.name, email: profiles.email })
    .from(profiles)
    .where(and(eq(profiles.id, assigneeId), isNull(profiles.deletedAt)))
    .limit(1)

  return row ?? null
}
