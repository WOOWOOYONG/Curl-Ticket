import type { CurlTicketClient } from '../api-client.js'
import { validateProjectId } from '../utils.js'

export async function membersCommand(
  client: CurlTicketClient,
  projectId: string,
  json = false
): Promise<void> {
  validateProjectId(projectId)
  const res = await client.getMembers(projectId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  if (res.data.length === 0) {
    console.log('No members found.')
    return
  }

  for (const member of res.data) {
    const display = member.name ?? member.email
    const joined = new Date(member.createdAt).toLocaleString()
    console.log(`${display}\t${joined}`)
  }
}
