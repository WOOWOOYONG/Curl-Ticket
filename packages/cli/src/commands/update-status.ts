import type { CurlTicketClient } from '../api-client.js'
import { normalizeStatus, parseIssueId, validateProjectId } from '../utils.js'

export async function updateStatusCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  status: string,
  json = false,
  dryRun = false
): Promise<void> {
  validateProjectId(projectId)
  const normalized = normalizeStatus(status)
  const parsed = parseIssueId(issueId)

  // If friendly ID, resolve to actual ID first
  let actualId: string
  let friendlyId: string | undefined
  if (parsed.type === 'number') {
    const issue = await client.getIssueByNumber(projectId, parsed.value)
    actualId = String(issue.data.id)
    friendlyId = issue.friendlyId
  } else {
    actualId = parsed.value
    if (dryRun) {
      const issue = await client.getIssue(projectId, parsed.value)
      friendlyId = issue.friendlyId
    }
  }

  if (dryRun) {
    const preview = {
      dryRun: true,
      projectId,
      issueId: actualId,
      ...(friendlyId ? { friendlyId } : {}),
      currentAction: 'update-status',
      newStatus: normalized
    }
    if (json) {
      process.stdout.write(JSON.stringify(preview, null, 2) + '\n')
    } else {
      console.log(`[dry-run] Would update issue ${friendlyId ?? actualId} status to "${normalized}"`)
    }
    return
  }

  const res = await client.updateIssueStatus(projectId, actualId, normalized)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  console.log(`Status updated to ${normalized}`)
}
