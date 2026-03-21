import type { CurlTicketClient } from '../api-client.js'
import { formatCommentSummary } from '../formatters.js'
import { validateProjectId } from '../utils.js'

export async function commentsCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  json = false
): Promise<void> {
  validateProjectId(projectId)

  const res = await client.getComments(projectId, issueId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  if (res.data.length === 0) {
    console.log('No comments found.')
    return
  }

  for (const comment of res.data) {
    console.log(formatCommentSummary(comment))
    console.log()
  }
}
