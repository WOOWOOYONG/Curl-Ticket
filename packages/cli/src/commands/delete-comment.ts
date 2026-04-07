import type { CurlTicketClient } from '../api-client.js'
import { confirm, validateProjectId } from '../utils.js'

export async function deleteCommentCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  commentId: string,
  json = false,
  force = false
): Promise<void> {
  validateProjectId(projectId)

  if (!json && !force) {
    const confirmed = await confirm(`Delete comment #${commentId}?`)
    if (!confirmed) {
      console.log('Cancelled.')
      return
    }
  }

  const res = await client.deleteComment(projectId, issueId, commentId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  console.log(`Comment #${commentId} deleted.`)
}
