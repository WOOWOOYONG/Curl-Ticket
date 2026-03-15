import type { CurlTicketClient } from '../api-client.js'
import { formatIssueSummary } from '../formatters.js'
import { normalizeStatus } from '../utils.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js'

interface IssuesCommandOptions {
  status?: string
  type?: string
  limit?: number
}

export async function issuesCommand(
  client: CurlTicketClient,
  projectId: string,
  options: IssuesCommandOptions
): Promise<void> {
  const status = options.status ? normalizeStatus(options.status) : undefined
  const limit = options.limit ? Math.min(options.limit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE

  const res = await client.getIssues(projectId, {
    status,
    issueType: options.type,
    limit
  })

  if (res.data.length === 0) {
    console.log('No issues found.')
    return
  }

  for (const issue of res.data) {
    console.log(formatIssueSummary(issue))
  }
}
