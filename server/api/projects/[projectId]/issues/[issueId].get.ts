import { getAccessibleIssue } from '~~/server/utils/issue-access'
import { buildProtectedIssueResponse } from '~~/server/utils/public-issue'

export default defineEventHandler(async (event) => {
  const { db, project, issue } = await getAccessibleIssue(event)

  return buildProtectedIssueResponse(db, issue, project, getRequestURL(event).origin)
})
