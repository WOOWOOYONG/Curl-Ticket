import type { CurlTicketClient } from '../api-client.js'
import { formatIssueDetail } from '../formatters.js'
import { parseIssueId } from '../utils.js'

export async function issueCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string
): Promise<void> {
  const parsed = parseIssueId(issueId)

  const res = parsed.type === 'id'
    ? await client.getIssue(projectId, parsed.value)
    : await client.getIssueByNumber(projectId, parsed.value)

  console.log(formatIssueDetail(res.data, res.friendlyId))
}
