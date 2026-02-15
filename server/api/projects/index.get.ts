import { and, or, count, desc, ilike, inArray, max, sql } from 'drizzle-orm'
import { projects, issues } from '~~/server/database/schema'
import { IssueStatus } from '~~/shared/constants'
import { buildProjectAccessCondition } from '~~/server/utils/project-access'
import { sanitizeSearchQuery, escapeLikePattern } from '~~/server/utils/search'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  // 1. 讀取查詢參數
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 12))
  const search = sanitizeSearchQuery(query.search)

  // 2. 計算 offset
  const offset = (page - 1) * pageSize

  // 3. 組合 WHERE 條件（存取權限 + 搜尋）
  const accessCondition = buildProjectAccessCondition(userId)
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

  // 4. 取得分頁的 projects + 總筆數
  const [paginatedProjects, totalResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(whereCondition)
      .orderBy(desc(projects.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(projects)
      .where(whereCondition)
  ])

  const total = totalResult[0]?.total ?? 0

  // 5. 針對這些 projects 查詢統計資料
  const projectIds = paginatedProjects.map(p => p.id)

  const stats = projectIds.length > 0
    ? await db
        .select({
          projectId: issues.projectId,
          totalIssues: count(issues.id),
          openIssues: sql<number>`count(case when ${issues.status} = ${IssueStatus.Open} then 1 end)`,
          lastUpdated: max(issues.updatedAt)
        })
        .from(issues)
        .where(inArray(issues.projectId, projectIds))
        .groupBy(issues.projectId)
    : []

  // 6. 合併資料
  const statsMap = new Map(stats.map(s => [s.projectId, s]))
  const data = paginatedProjects.map(p => ({
    ...p,
    totalIssues: statsMap.get(p.id)?.totalIssues ?? 0,
    openIssues: statsMap.get(p.id)?.openIssues ?? 0,
    lastUpdated: statsMap.get(p.id)?.lastUpdated ?? null
  }))

  // 7. 計算所有符合條件的專案的 summary 統計（不受分頁影響，使用 subquery 避免多一次查詢）
  const summaryResult = total > 0
    ? await db
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

  // 8. 計算總頁數
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
