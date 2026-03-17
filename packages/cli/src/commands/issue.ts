import type { CurlTicketClient } from '../api-client.js'
import { formatIssueDetail } from '../formatters.js'
import { parseIssueId } from '../utils.js'

export async function issueCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  json = false
): Promise<void> {
  const parsed = parseIssueId(issueId)

  const res = parsed.type === 'id'
    ? await client.getIssue(projectId, parsed.value)
    : await client.getIssueByNumber(projectId, parsed.value)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  console.log(formatIssueDetail(res.data, res.friendlyId))
}
