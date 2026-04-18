import type { SQL } from 'drizzle-orm'
import { and, asc, count, desc, eq, ilike, inArray, ne } from 'drizzle-orm'
import { issues, projects } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'
import { buildAccessibleActiveProjectCondition } from '~~/server/utils/project-access'
import { sanitizeSearchQuery, escapeLikePattern } from '~~/server/utils/search'
import { IssueStatus } from '~~/shared/constants'
import type { issueStatuses } from '~~/shared/constants'
import {
  EMPTY_MY_ISSUES_SUMMARY,
  ISSUE_STATUS_SUMMARY_KEY,
  myIssuesQuerySchema,
  type MyIssueListItem,
  type MyIssuesResponse,
  type MyIssuesSummary
} from '~~/shared/schemas/me-issues'

export default defineEventHandler(async (event): Promise<MyIssuesResponse> => {
  const userId = event.context.userId as string

  const parsed = myIssuesQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    badRequest(
      parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      { issues: parsed.error.issues }
    )
  }
  const { page, pageSize, status, projectId, environment, sort, order } = parsed.data

  const baseConditions: SQL[] = [
    eq(issues.assigneeId, userId),
    buildAccessibleActiveProjectCondition(userId)!
  ]

  // Summary: reflects unfiltered assignments (gated by access only).
  const summaryRows = await useDB()
    .select({ status: issues.status, count: count() })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .where(and(...baseConditions))
    .groupBy(issues.status)

  const summary: MyIssuesSummary = { ...EMPTY_MY_ISSUES_SUMMARY }
  for (const row of summaryRows) {
    const key = ISSUE_STATUS_SUMMARY_KEY[row.status]
    if (key) summary[key] = row.count
    summary.total += row.count
  }

  const listConditions: SQL[] = [...baseConditions]

  if (status && status.length > 0) {
    listConditions.push(inArray(issues.status, status))
  } else {
    listConditions.push(ne(issues.status, IssueStatus.Close))
  }

  if (projectId) {
    listConditions.push(eq(issues.projectId, projectId))
  }

  if (environment) {
    listConditions.push(eq(issues.environment, environment))
  }

  const search = sanitizeSearchQuery(parsed.data.search)
  if (search) {
    const escaped = escapeLikePattern(search)
    listConditions.push(ilike(issues.title, `%${escaped}%`))
  }

  const sortColumn =
    sort === 'createdAt' ? issues.createdAt : sort === 'status' ? issues.status : issues.updatedAt
  const orderFn = order === 'asc' ? asc : desc

  const whereClause = and(...listConditions)
  const offset = (page - 1) * pageSize

  const [rows, totalResult] = await Promise.all([
    useDB()
      .select({
        id: issues.id,
        issueNumber: issues.issueNumber,
        title: issues.title,
        status: issues.status,
        environment: issues.environment,
        assigneeId: issues.assigneeId,
        updatedAt: issues.updatedAt,
        createdAt: issues.createdAt,
        projectId: issues.projectId,
        projectKey: projects.key,
        projectName: projects.name
      })
      .from(issues)
      .innerJoin(projects, eq(projects.id, issues.projectId))
      .where(whereClause)
      .orderBy(orderFn(sortColumn), desc(issues.id))
      .limit(pageSize)
      .offset(offset),
    useDB()
      .select({ total: count() })
      .from(issues)
      .innerJoin(projects, eq(projects.id, issues.projectId))
      .where(whereClause)
  ])

  const total = totalResult[0]?.total ?? 0
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0

  const data: MyIssueListItem[] = rows.map((row) => ({
    id: row.id,
    issueNumber: row.issueNumber,
    title: row.title,
    status: row.status as (typeof issueStatuses)[number],
    environment: row.environment,
    assigneeId: row.assigneeId,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    project: {
      id: row.projectId,
      key: row.projectKey,
      name: row.projectName
    }
  }))

  return {
    data,
    pagination: { page, pageSize, total, totalPages },
    summary
  }
})
