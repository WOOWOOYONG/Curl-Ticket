import type { CurlTicketClient } from '../api-client.js'
import { normalizeStatus, parseIssueId } from '../utils.js'

export async function updateStatusCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  status: string
): Promise<void> {
  const normalized = normalizeStatus(status)
  const parsed = parseIssueId(issueId)

  // If friendly ID, resolve to actual ID first
  let actualId: string
  if (parsed.type === 'number') {
    const issue = await client.getIssueByNumber(projectId, parsed.value)
    actualId = String(issue.data.id)
  } else {
    actualId = parsed.value
  }

  await client.updateIssueStatus(projectId, actualId, normalized)
  console.log(`Status updated to ${normalized}`)
}
