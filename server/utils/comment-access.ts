import { and, eq } from 'drizzle-orm'
import type { useDB } from '~~/server/utils/db'
import { issues, issueComments } from '~~/server/database/schema'
import { notFound, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

type DB = ReturnType<typeof useDB>

/**
 * Verify that an issue belongs to a project. Returns the verified issue row.
 * Throws 404 if the issue does not exist within the given project.
 */
export async function getProjectIssue(db: DB, projectId: string, issueId: string) {
  const [issue] = await db
    .select({
      id: issues.id,
      title: issues.title,
      projectKey: issues.projectKey,
      issueNumber: issues.issueNumber,
      createdBy: issues.createdBy
    })
    .from(issues)
    .where(and(eq(issues.id, Number(issueId)), eq(issues.projectId, projectId)))
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  return issue
}

/**
 * Verify that a comment belongs to an issue. Returns the verified comment row.
 * Throws 404 if the comment does not exist within the given issue.
 */
export async function getIssueComment(db: DB, issueId: string, commentId: string) {
  const [comment] = await db
    .select({ id: issueComments.id, authorId: issueComments.authorId })
    .from(issueComments)
    .where(and(eq(issueComments.id, Number(commentId)), eq(issueComments.issueId, Number(issueId))))
    .limit(1)

  if (!comment) {
    notFound('Comment not found')
  }

  return comment
}

/**
 * Assert that the given userId matches the comment's authorId.
 * Throws 403 if they differ.
 */
export function assertCommentAuthor(
  comment: { authorId: string },
  userId: string,
  action: string = 'modify'
): void {
  if (comment.authorId !== userId) {
    forbidden(`You can only ${action} your own comments`)
  }
}

/**
 * 載入使用者有權編輯的 Comment。
 *
 * 集中編輯/刪除 Comment 的完整存取檢查：確認 Project 存取權、確認 Issue 屬於該 Project、
 * 確認 Comment 屬於該 Issue，最後確認使用者是 Comment 作者。
 *
 * @throws 404 Project / Issue / Comment 不存在或無權限
 * @throws 403 使用者不是 Comment 作者
 */
export async function getEditableComment(
  db: DB,
  projectId: string,
  issueId: string,
  commentId: string,
  userId: string,
  action: string = 'modify'
) {
  await getAccessibleProject(db, projectId, userId)
  await getProjectIssue(db, projectId, issueId)
  const comment = await getIssueComment(db, issueId, commentId)
  assertCommentAuthor(comment, userId, action)
  return comment
}
