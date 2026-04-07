import type { CurlTicketClient } from '../api-client.js'
import { formatPagination } from '../formatters.js'

export async function projectsCommand(client: CurlTicketClient, json = false): Promise<void> {
  const res = await client.getProjects()
  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }
  for (const project of res.data) {
    console.log(`${project.key}\t${project.name}\t(${project.id})`)
  }

  const hint = formatPagination(res.pagination)
  if (hint) {
    process.stderr.write(hint + '\n')
  }
}
