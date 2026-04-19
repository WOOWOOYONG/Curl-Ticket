import { and, asc, eq } from 'drizzle-orm'
import { issues, projects } from '~~/server/database/schema'
import { buildAccessibleActiveProjectCondition } from '~~/server/utils/project-access'
import type { MyIssueProjectRef } from '~~/shared/schemas/me-issues'

export default defineEventHandler(async (event): Promise<MyIssueProjectRef[]> => {
  const userId = event.context.userId as string

  const rows = await useDB()
    .selectDistinct({
      id: projects.id,
      key: projects.key,
      name: projects.name
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .where(and(eq(issues.assigneeId, userId), buildAccessibleActiveProjectCondition(userId)!))
    .orderBy(asc(projects.key))

  return rows
})
