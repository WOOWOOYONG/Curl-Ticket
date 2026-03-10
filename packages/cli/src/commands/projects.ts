import type { CurlTicketClient } from '../api-client.js'

export async function projectsCommand(client: CurlTicketClient): Promise<void> {
  const res = await client.getProjects()
  for (const project of res.data) {
    console.log(`${project.key}\t${project.name}\t(${project.id})`)
  }
}
