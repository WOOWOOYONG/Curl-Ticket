import { count, desc, inArray, max, sql } from 'drizzle-orm'
import { projects, issues } from '../../database/schema'
import { IssueStatus } from '~~/shared/constants'

export default defineEventHandler(async (event) => {
  const db = useDB()

  // 1. 讀取查詢參數
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))

  // 2. 計算 offset
  const offset = (page - 1) * pageSize

  // 3. 先取得分頁的 projects + 總筆數（不 JOIN issues）
  const [paginatedProjects, [{ total }]] = await Promise.all([
    db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(projects)
  ])

  // 4. 針對這些 projects 查詢統計資料
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

  // 5. 合併資料
  const statsMap = new Map(stats.map(s => [s.projectId, s]))
  const data = paginatedProjects.map(p => ({
    ...p,
    totalIssues: statsMap.get(p.id)?.totalIssues ?? 0,
    openIssues: statsMap.get(p.id)?.openIssues ?? 0,
    lastUpdated: statsMap.get(p.id)?.lastUpdated ?? null
  }))

  // 6. 計算總頁數
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  }
})
