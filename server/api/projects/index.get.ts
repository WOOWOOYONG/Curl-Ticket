import { and, or, count, desc, ilike, inArray, max, sql } from 'drizzle-orm'
import { projects, issues } from '~~/server/database/schema'
import { IssueStatus } from '~~/shared/constants'
import { buildAccessibleActiveProjectCondition } from '~~/server/utils/project-access'
import { sanitizeSearchQuery, escapeLikePattern } from '~~/server/utils/search'
import { projectQuerySchema } from '~~/shared/schemas/query'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  // 1. 驗證並讀取查詢參數（parse 失敗會直接拋出 ZodError，由 Nuxt error handler 處理）
  const { page, pageSize, search: rawSearch } = projectQuerySchema.parse(getQuery(event))
  const search = sanitizeSearchQuery(rawSearch)

  // 2. 計算 offset
  const offset = (page - 1) * pageSize

  // 3. 組合 WHERE 條件（存取權限 + 搜尋）
  const accessCondition = buildAccessibleActiveProjectCondition(userId)
  const whereCondition = search
    ? (() => {
        const escaped = escapeLikePattern(search)
        return and(
          accessCondition,
          or(
            ilike(projects.name, `%${escaped}%`),
            ilike(projects.key, `%${escaped}%`),
            ilike(projects.description, `%${escaped}%`)
          )
        )
      })()
    : accessCondition

  // 4. 取得分頁的 projects（使用 window function 同時取得 total count，減少一次 DB 查詢）
  const projectsWithTotal = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      description: projects.description,
      ownerId: projects.ownerId,
      environments: projects.environments,
      createdAt: projects.createdAt,
      total: sql<number>`count(*) over()`
    })
    .from(projects)
    .where(whereCondition)
    .orderBy(desc(projects.createdAt))
    .limit(pageSize)
    .offset(offset)

  const total = projectsWithTotal[0]?.total ?? 0
  const paginatedProjects = projectsWithTotal.map(({ total: _, ...p }) => p)

  // 5. 針對這些 projects 查詢統計資料 + 全域 summary（並行執行）
  const projectIds = paginatedProjects.map((p) => p.id)

  const [stats, summaryResult] = await Promise.all([
    projectIds.length > 0
      ? db
          .select({
            projectId: issues.projectId,
            totalIssues: count(issues.id),
            openIssues: sql<number>`count(case when ${issues.status} = ${IssueStatus.Open} then 1 end)`,
            lastUpdated: max(issues.updatedAt)
          })
          .from(issues)
          .where(inArray(issues.projectId, projectIds))
          .groupBy(issues.projectId)
      : [],
    total > 0
      ? db
          .select({
            totalIssues: count(issues.id),
            openIssues: sql<number>`count(case when ${issues.status} = ${IssueStatus.Open} then 1 end)`
          })
          .from(issues)
          .where(
            inArray(
              issues.projectId,
              db.select({ id: projects.id }).from(projects).where(whereCondition)
            )
          )
      : [{ totalIssues: 0, openIssues: 0 }]
  ])

  // 6. 合併資料
  const statsMap = new Map(stats.map((s) => [s.projectId, s]))
  const data = paginatedProjects.map((p) => ({
    ...p,
    totalIssues: statsMap.get(p.id)?.totalIssues ?? 0,
    openIssues: statsMap.get(p.id)?.openIssues ?? 0,
    lastUpdated: statsMap.get(p.id)?.lastUpdated ?? null
  }))

  // 7. 計算總頁數
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    },
    summary: {
      totalProjects: total,
      totalIssues: summaryResult[0]?.totalIssues ?? 0,
      openIssues: summaryResult[0]?.openIssues ?? 0
    }
  }
})
