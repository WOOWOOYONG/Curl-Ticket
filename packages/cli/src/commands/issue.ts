import type { CurlTicketClient } from '../api-client.js'
import { formatIssueDetail } from '../formatters.js'
import { parseIssueId, validateProjectId, ValidationError } from '../utils.js'
import { ISSUE_FIELDS } from '../constants.js'

export async function issueCommand(
  client: CurlTicketClient,
  projectId: string,
  issueId: string,
  json = false,
  fields?: string
): Promise<void> {
  validateProjectId(projectId)
  const parsed = parseIssueId(issueId)

  const res = parsed.type === 'id'
    ? await client.getIssue(projectId, parsed.value)
    : await client.getIssueByNumber(projectId, parsed.value)

  if (json) {
    if (fields) {
      const requested = fields.split(',').map(f => f.trim())
      const validFields = ISSUE_FIELDS as readonly string[]
      const invalid = requested.filter(f => f !== 'id' && !validFields.includes(f))
      if (invalid.length > 0) {
        throw new ValidationError(`Invalid fields: ${invalid.join(', ')}. Valid fields: ${ISSUE_FIELDS.join(', ')}`)
      }

      // Always include id
      const fieldSet = new Set(['id', ...requested])
      const filtered: Record<string, unknown> = {}
      const data = res.data as unknown as Record<string, unknown>
      for (const key of fieldSet) {
        if (key in data) {
          filtered[key] = data[key]
        }
      }
      process.stdout.write(JSON.stringify({ data: filtered, friendlyId: res.friendlyId }, null, 2) + '\n')
    } else {
      process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    }
    return
  }

  console.log(formatIssueDetail(res.data, res.friendlyId))
}
