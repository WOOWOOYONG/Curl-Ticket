import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { parseIssueId } from '~~/server/utils/route-params'
import { enablePublicSharing } from '~~/server/utils/public-sharing'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  if (!issueId) {
    badRequest('Issue ID is required')
  }

  const parsedIssueId = parseIssueId(issueId)
  const db = useDB()
  const userId = event.context.userId as string
  await getAccessibleProject(db, projectId, userId)

  return enablePublicSharing(db, projectId, parsedIssueId, getRequestURL(event).origin)
})
