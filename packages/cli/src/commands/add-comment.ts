import type { CurlTicketClient } from '../api-client.js'
import { formatCommentDetail } from '../formatters.js'
import { validateProjectId, validateCommentContent } from '../utils.js'

export async function addCommentCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  content: string,
  json = false
): Promise<void> {
  validateProjectId(projectId)
  validateCommentContent(content)

  const res = await client.createComment(projectId, issueId, content)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  console.log('Comment created:')
  console.log(formatCommentDetail(res.data))
}
