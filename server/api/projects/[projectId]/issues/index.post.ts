import { eq, max } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { createIssueSchema, nullifyApiBugFields, pickApiBugFields } from '~~/shared/schemas'
import type { CreateApiBugInput } from '~~/shared/schemas'
import { IssueType } from '~~/shared/constants'
import { MAX_CREATE_ATTEMPTS, UNIQUE_VIOLATION_CODE } from '~~/server/constants'
import { badRequest, internalServerError } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  // 從 middleware 取得已驗證的 userId
  const userId = event.context.userId as string

  // 1. 取得專案 ID
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()

  function isUniqueViolation(error: unknown) {
    const err = error as { code?: string; cause?: { code?: string } }
    return err?.code === UNIQUE_VIOLATION_CODE || err?.cause?.code === UNIQUE_VIOLATION_CODE
  }

  // 3. 驗證使用者可存取專案，並取得專案 key
  const project = await getAccessibleProject(db, projectId, userId)

  // 4. 讀取並驗證 request body
  const body = await readBody(event)
  const result = createIssueSchema.safeParse({ ...body, projectId })

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const data = result.data
  const isTask = data.issueType === IssueType.Task

  // 5. 計算該專案的下一個 issue_number，若遇到唯一性衝突則重試
  const issueBase = {
    projectId,
    projectKey: project.key,
    issueType: data.issueType,
    title: data.title,
    description: data.description ?? null,
    status: data.status,
    createdBy: userId,
    ...(isTask ? nullifyApiBugFields() : pickApiBugFields(data as CreateApiBugInput))
  }

  let nextIssueNumber = 0
  let newIssue: typeof issues.$inferSelect | undefined
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const [maxResult] = await db
      .select({ maxNumber: max(issues.issueNumber) })
      .from(issues)
      .where(eq(issues.projectId, projectId))

    nextIssueNumber = (maxResult?.maxNumber ?? 0) + 1

    try {
      const created = await db
        .insert(issues)
        .values({
          ...issueBase,
          issueNumber: nextIssueNumber
        })
        .returning()
      newIssue = created[0]
      break
    } catch (error) {
      lastError = error
      if (isUniqueViolation(error) && attempt < MAX_CREATE_ATTEMPTS) {
        continue
      }
      throw error
    }
  }

  if (!newIssue) {
    internalServerError('Failed to create issue', lastError)
  }

  return {
    data: newIssue,
    friendlyId: `${project.key}-${nextIssueNumber}`
  }
})
