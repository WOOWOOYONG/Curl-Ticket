import type { CurlTicketClient } from '../api-client.js'

export async function createProjectCommand(
  client: CurlTicketClient,
  name: string,
  key: string,
  description: string | undefined,
  json = false
): Promise<void> {
  const res = await client.createProject({ name, key, description })

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  const { data: project } = res
  console.log(`Project created: ${project.name} (${project.key}) — ${project.id}`)
}
