import type { CurlTicketClient } from '../api-client.js'
import { parseIssueId, resolveAssignee, validateProjectId } from '../utils.js'

export async function assignCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  value: string,
  options: { json?: boolean; dryRun?: boolean }
): Promise<void> {
  validateProjectId(projectId)
  const parsed = parseIssueId(issueId)
  const { json = false, dryRun = false } = options

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

  const newAssigneeId = await resolveAssignee({ value, projectId, client })

  if (dryRun) {
    const preview = {
      dryRun: true,
      issueId: actualId,
      ...(friendlyId ? { friendlyId } : {}),
      newAssigneeId
    }
    if (json) {
      process.stdout.write(JSON.stringify(preview, null, 2) + '\n')
    } else {
      const label = friendlyId ?? actualId
      const assigneeLabel = newAssigneeId ?? 'none'
      console.log(`[dry-run] Would assign issue ${label} to ${assigneeLabel}`)
    }
    return
  }

  const res = await client.updateIssueAssignee(projectId, actualId, newAssigneeId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  const label = res.friendlyId ?? actualId
  const assigneeLabel =
    res.data.assignee?.name ?? res.data.assignee?.email ?? newAssigneeId ?? 'Unassigned'
  console.log(`Assigned issue ${label} to ${assigneeLabel}`)
}
