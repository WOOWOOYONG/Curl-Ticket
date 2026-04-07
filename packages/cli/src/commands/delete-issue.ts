import type { CurlTicketClient } from '../api-client.js'
import { confirm, validateProjectId } from '../utils.js'

export async function deleteIssueCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  json = false,
  force = false
): Promise<void> {
  validateProjectId(projectId)

  if (!json && !force) {
    const confirmed = await confirm(`Delete issue ${issueId}?`)
    if (!confirmed) {
      console.log('Cancelled.')
      return
    }
  }

  const res = await client.deleteIssue(projectId, issueId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  console.log(`Issue ${issueId} deleted.`)
}
