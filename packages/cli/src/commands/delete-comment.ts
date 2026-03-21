import { createInterface } from 'node:readline'
import type { CurlTicketClient } from '../api-client.js'
import { validateProjectId } from '../utils.js'

function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

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
