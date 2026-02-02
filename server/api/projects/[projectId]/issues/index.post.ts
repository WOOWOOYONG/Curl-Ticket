import { eq, max } from 'drizzle-orm'
import { projects, issues } from '../../../../database/schema'
import { createIssueSchema } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  // 從 middleware 取得已驗證的 userId
  const userId = event.context.userId as string

  // 1. 取得專案 ID
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const db = useDB()

  // 3. 驗證專案存在並取得 key
  const [project] = await db
    .select({ id: projects.id, key: projects.key })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  // 4. 讀取並驗證 request body
  const body = await readBody(event)
  const result = createIssueSchema.omit({ projectId: true }).safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: result.error.issues
    })
  }

  // 5. 計算該專案的下一個 issue_number
  const [maxResult] = await db
    .select({ maxNumber: max(issues.issueNumber) })
    .from(issues)
    .where(eq(issues.projectId, projectId))

  const nextIssueNumber = (maxResult?.maxNumber ?? 0) + 1

  // 6. 建立 Issue
  const [newIssue] = await db
    .insert(issues)
    .values({
      projectId,
      projectKey: project.key,
      issueNumber: nextIssueNumber,
      title: result.data.title,
      description: result.data.description ?? null,
      method: result.data.method,
      url: result.data.url,
      environment: result.data.environment,
      requestHeaders: result.data.requestHeaders ?? null,
      requestBody: result.data.requestBody ?? null,
      responseStatus: result.data.responseStatus ?? null,
      responseBody: result.data.responseBody ?? null,
      status: result.data.status,
      createdBy: userId
    })
    .returning()

  return {
    data: newIssue,
    friendlyId: `${project.key}-${nextIssueNumber}`
  }
})
