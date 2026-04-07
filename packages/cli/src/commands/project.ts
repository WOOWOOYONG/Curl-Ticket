import type { CurlTicketClient } from '../api-client.js'
import { validateProjectId } from '../utils.js'

export async function projectCommand(
  client: CurlTicketClient,
  projectId: string,
  json = false
): Promise<void> {
  validateProjectId(projectId)
  const res = await client.getProject(projectId)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  const { data: project } = res
  const fields: [string, string | number | null | undefined][] = [
    ['Name', project.name],
    ['Key', project.key],
    ['ID', project.id],
    ['Description', project.description],
    ['Total Issues', project.totalIssues],
    ['Open Issues', project.openIssues],
    ['Created', new Date(project.createdAt).toLocaleString()]
  ]

  for (const [label, value] of fields) {
    if (value != null) {
      console.log(`${label}: ${value}`)
    }
  }
}
