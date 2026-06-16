import { randomBytes } from 'node:crypto'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { issues, projects } from '~~/server/database/schema'
import type { useDB } from '~~/server/utils/db'
import { isUniqueViolation, MAX_CREATE_ATTEMPTS } from '~~/server/constants'
import { badRequest, internalServerError, notFound } from '~~/server/utils/errors'
import type { PublicIssue } from '~~/shared/schemas/issue'
import { IssueType } from '~~/shared/constants'
import { maskHeaders } from '~~/shared/utils/headers'

type DB = ReturnType<typeof useDB>
type IssueRow = typeof issues.$inferSelect

export const SHARE_TOKEN_BYTES = 32

export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url')
}

export function canShareIssue(issue: Pick<IssueRow, 'issueType' | 'method' | 'url'>): boolean {
  return issue.issueType === IssueType.ApiBug && Boolean(issue.method) && Boolean(issue.url)
}

export function buildPublicShareStatus(
  issue: Pick<IssueRow, 'publicShareToken' | 'publicSharedAt'>,
  origin: string
) {
  return {
    enabled: Boolean(issue.publicShareToken),
    sharedAt: issue.publicSharedAt,
    shareUrl: issue.publicShareToken ? `${origin}/share/issues/${issue.publicShareToken}` : null
  }
}

/**
 * 為一筆 API Bug 開啟（或重新產生）Public Sharing。
 *
 * 集中 Public Sharing 的開啟鐵則：
 * - 只有 API Bug 可分享，否則 400
 * - 一律產生全新的 Share Token 覆蓋舊值（一個 API Bug 至多一個有效 Share Link），並重設 sharedAt
 * - 以 FOR UPDATE 鎖定「資格檢查 → 更新」避免競態；token 碰撞時重試（機率近乎為零，純防禦）
 */
export async function enablePublicSharing(
  db: DB,
  projectId: string,
  issueId: number,
  origin: string
) {
  let sharedIssue: Pick<IssueRow, 'publicShareToken' | 'publicSharedAt'> | undefined
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const nextSharedAt = new Date()
    const nextToken = generateShareToken()

    try {
      sharedIssue = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            issueType: issues.issueType,
            method: issues.method,
            url: issues.url
          })
          .from(issues)
          .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
          .for('update')

        if (!existing) {
          notFound('Issue not found')
        }

        if (!canShareIssue(existing)) {
          badRequest('Only API Bug issues can be shared publicly')
        }

        const [updated] = await tx
          .update(issues)
          .set({
            publicShareToken: nextToken,
            publicSharedAt: nextSharedAt,
            updatedAt: nextSharedAt
          })
          .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
          .returning({
            publicShareToken: issues.publicShareToken,
            publicSharedAt: issues.publicSharedAt
          })

        if (!updated) {
          notFound('Issue not found')
        }

        return updated
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

  if (!sharedIssue) {
    internalServerError('Failed to enable public sharing', lastError)
  }

  return buildPublicShareStatus(sharedIssue, origin)
}

/**
 * 關閉一筆 Issue 的 Public Sharing：清除 Share Token，使現有 Share Link 立即失效。
 */
export async function disablePublicSharing(
  db: DB,
  projectId: string,
  issueId: number,
  origin: string
) {
  const [updated] = await db
    .update(issues)
    .set({
      publicShareToken: null,
      publicSharedAt: null,
      updatedAt: new Date()
    })
    .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
    .returning({
      publicShareToken: issues.publicShareToken,
      publicSharedAt: issues.publicSharedAt
    })

  if (!updated) {
    notFound('Issue not found')
  }

  return buildPublicShareStatus(updated, origin)
}

type PublicIssueSource = Pick<
  IssueRow,
  | 'projectKey'
  | 'issueNumber'
  | 'title'
  | 'description'
  | 'method'
  | 'url'
  | 'environment'
  | 'requestHeaders'
  | 'requestBody'
  | 'responseStatus'
  | 'responseBody'
  | 'createdAt'
  | 'updatedAt'
>

export function buildPublicIssueDTO(issue: PublicIssueSource): PublicIssue {
  if (!issue.method || !issue.url) {
    throw new Error('Public issue is missing API request data')
  }

  return {
    friendlyId: `${issue.projectKey}-${issue.issueNumber}`,
    title: issue.title,
    description: issue.description,
    method: issue.method,
    url: issue.url,
    environment: issue.environment,
    requestHeaders: maskHeaders(issue.requestHeaders),
    requestBody: issue.requestBody,
    responseStatus: issue.responseStatus,
    responseBody: issue.responseBody,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt
  }
}

/**
 * 用 Share Token 解析出對應的 Public Issue Page 資料。
 *
 * 集中 Public Sharing 的讀取鐵則：
 * - 反映「當前」的 API Bug（即時查詢，非快照）
 * - 只回傳已啟用分享、含請求資料的 API Bug，且其 Project 未被軟刪除者
 * - 無論失效原因為何（token 不存在 / 已停用 / API Bug 被刪 / Project 被刪），一律回相同的 404，
 *   不向 Public Viewer 洩漏原因
 * - request headers 以公開安全的遮罩形式回傳
 */
export async function resolvePublicIssue(db: DB, token: string | undefined) {
  if (!token) {
    notFound('Issue not found')
  }

  const [issue] = await db
    .select({
      issueNumber: issues.issueNumber,
      projectKey: issues.projectKey,
      title: issues.title,
      description: issues.description,
      method: issues.method,
      url: issues.url,
      environment: issues.environment,
      requestHeaders: issues.requestHeaders,
      requestBody: issues.requestBody,
      responseStatus: issues.responseStatus,
      responseBody: issues.responseBody,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(
      and(
        eq(issues.publicShareToken, token),
        eq(issues.issueType, IssueType.ApiBug),
        isNotNull(issues.method),
        isNotNull(issues.url),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  return buildPublicIssueDTO(issue)
}
