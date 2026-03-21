import type { CurlTicketClient } from '../api-client.js'
import { formatCommentDetail } from '../formatters.js'
import { validateProjectId } from '../utils.js'

export async function getCommentCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  commentId: string,
  json = false
): Promise<void> {
  validateProjectId(projectId)

  const res = await client.getComment(projectId, issueId, commentId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  console.log(formatCommentDetail(res.data))
}
