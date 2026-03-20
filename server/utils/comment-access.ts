import { and, eq } from 'drizzle-orm'
import type { useDB } from '~~/server/utils/db'
import { issues, issueComments } from '~~/server/database/schema'
import { notFound, forbidden } from '~~/server/utils/errors'

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
    .where(
      and(
        eq(issues.id, Number(issueId)),
        eq(issues.projectId, projectId)
      )
    )
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
    .where(
      and(
        eq(issueComments.id, Number(commentId)),
        eq(issueComments.issueId, Number(issueId))
      )
    )
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
