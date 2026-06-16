import { eq, max } from 'drizzle-orm'
import { issues, notifications } from '~~/server/database/schema'
import { createIssueSchema, nullifyApiBugFields, pickApiBugFields } from '~~/shared/schemas'
import type { CreateApiBugInput } from '~~/shared/schemas'
import { IssueType, NotificationType } from '~~/shared/constants'
import { isUniqueViolation, MAX_CREATE_ATTEMPTS } from '~~/server/constants'
import { badRequest, internalServerError } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { assertAssigneeAllowed } from '~~/server/utils/issue-assignee'
import { buildProtectedIssueResponse } from '~~/server/utils/public-issue'

export default defineEventHandler(async (event) => {
  // 從 middleware 取得已驗證的 userId
  const userId = event.context.userId as string

  // 1. 取得專案 ID
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()

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
  const assigneeId = data.assigneeId ?? null

  // Validate assignee before entering the retry loop (cheap + no DB writes yet).
  await assertAssigneeAllowed(db, projectId, assigneeId)

  // 5. 計算該專案的下一個 issue_number，若遇到唯一性衝突則重試
  const issueBase = {
    projectId,
    projectKey: project.key,
    issueType: data.issueType,
    title: data.title,
    description: data.description ?? null,
    status: data.status,
    assigneeId,
    createdBy: userId,
    ...(isTask ? nullifyApiBugFields() : pickApiBugFields(data as CreateApiBugInput))
  }

  let newIssue: typeof issues.$inferSelect | undefined
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const [maxResult] = await db
      .select({ maxNumber: max(issues.issueNumber) })
      .from(issues)
      .where(eq(issues.projectId, projectId))

    const candidateNumber = (maxResult?.maxNumber ?? 0) + 1

    try {
      newIssue = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(issues)
          .values({
            ...issueBase,
            issueNumber: candidateNumber
          })
          .returning()

        if (!created) {
          internalServerError('Failed to insert issue')
        }

        if (assigneeId && assigneeId !== userId) {
          await tx.insert(notifications).values({
            userId: assigneeId,
            issueId: created.id,
            type: NotificationType.IssueUpdate,
            title: `Issue ${project.key}-${candidateNumber} assigned to you`,
            content: created.title
          })
        }

        return created
      })
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

  return buildProtectedIssueResponse(db, newIssue, project, getRequestURL(event).origin)
})
