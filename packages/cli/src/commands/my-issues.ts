import type { CurlTicketClient } from '../api-client.js'
import type { MyIssuesOptions, MyIssueItem, MyIssuesSummary } from '../types.js'
import {
  normalizeStatus,
  normalizeEnvironment,
  validateProjectId,
  ValidationError
} from '../utils.js'

const VALID_SORTS = ['updatedAt', 'createdAt', 'status'] as const
const VALID_ORDERS = ['asc', 'desc'] as const
const MIN_PAGE = 1
const MAX_PAGE_SIZE = 50

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function formatSummaryLine(summary: MyIssuesSummary): string {
  return `Open ${summary.open} · In Progress ${summary.inProgress} · Done ${summary.done} · Close ${summary.close} · Total ${summary.total}`
}

function formatIssueRow(item: MyIssueItem): string {
  const projectRef = `${item.project.key}#${item.issueNumber}`
  const updated = relativeTime(item.updatedAt)
  const env = item.environment ?? '-'
  return `${projectRef} [${item.status}] [${env}] ${updated} — ${item.title}`
}

interface MyIssuesCommandOptions {
  status?: string[]
  project?: string
  environment?: string
  search?: string
  sort?: string
  order?: string
  page?: string
  pageSize?: string
}

function parsePositiveInt(value: string, field: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < MIN_PAGE) {
    throw new ValidationError(`${field} must be a positive integer.`)
  }
  return parsed
}

export async function myIssuesCommand(
  client: CurlTicketClient,
  options: MyIssuesCommandOptions,
  json = false
): Promise<void> {
  const apiOptions: MyIssuesOptions = {}

  if (options.status?.length) {
    apiOptions.status = options.status.map((s) => normalizeStatus(s))
  }

  if (options.project) {
    validateProjectId(options.project)
    apiOptions.projectId = options.project
  }

  if (options.environment) {
    apiOptions.environment = normalizeEnvironment(options.environment)
  }

  if (options.search) {
    apiOptions.search = options.search
  }

  if (options.sort) {
    if (!VALID_SORTS.includes(options.sort as (typeof VALID_SORTS)[number])) {
      throw new ValidationError(
        `Invalid sort value "${options.sort}". Valid values: ${VALID_SORTS.join(', ')}`
      )
    }
    apiOptions.sort = options.sort as MyIssuesOptions['sort']
  }

  if (options.order) {
    if (!VALID_ORDERS.includes(options.order as (typeof VALID_ORDERS)[number])) {
      throw new ValidationError(
        `Invalid order value "${options.order}". Valid values: ${VALID_ORDERS.join(', ')}`
      )
    }
    apiOptions.order = options.order as MyIssuesOptions['order']
  }

  if (options.page) {
    apiOptions.page = parsePositiveInt(options.page, 'page')
  }

  if (options.pageSize) {
    const pageSize = parsePositiveInt(options.pageSize, 'pageSize')
    if (pageSize > MAX_PAGE_SIZE) {
      throw new ValidationError(`pageSize must be ${MAX_PAGE_SIZE} or less.`)
    }
    apiOptions.pageSize = pageSize
  }

  const res = await client.getMyIssues(apiOptions)

  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }

  const { summary, data } = res

  if (summary.total === 0) {
    console.log('No issues assigned to you.')
    return
  }

  console.log(formatSummaryLine(summary))

  if (data.length === 0) {
    console.log('No issues match the current filters.')
    return
  }

  for (const item of data) {
    console.log(formatIssueRow(item))
  }
}
