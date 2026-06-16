import type { issues } from '~~/server/database/schema'
import type { useDB } from '~~/server/utils/db'
import { getAssigneeSummary } from '~~/server/utils/issue-assignee'
import { buildPublicShareStatus } from '~~/server/utils/public-sharing'
import type { AssigneeSummary } from '~~/shared/schemas/issue'

type IssueRow = typeof issues.$inferSelect

export function buildProtectedIssueData(issue: IssueRow, assignee: AssigneeSummary | null) {
  const { publicShareToken: _publicShareToken, publicSharedAt: _publicSharedAt, ...data } = issue
  return { ...data, assignee }
}

/**
 * 將整筆 Issue row 投影為 Registered User 的 Protected Issue View 回應。
 *
 * 集中三件事：補上 assignee 摘要、組出 friendlyId（如 "ABC-12"）、附上 Public Sharing 狀態。
 * 取得（GET）、更新（PATCH）、建立（POST）三條路由共用同一個回應形狀，且絕不外洩 Share Token。
 */
export async function buildProtectedIssueResponse(
  db: ReturnType<typeof useDB>,
  issue: IssueRow,
  project: { key: string },
  origin: string
) {
  const assignee = await getAssigneeSummary(db, issue.assigneeId)
  return {
    data: buildProtectedIssueData(issue, assignee),
    friendlyId: `${project.key}-${issue.issueNumber}`,
    publicShare: buildPublicShareStatus(issue, origin)
  }
}
