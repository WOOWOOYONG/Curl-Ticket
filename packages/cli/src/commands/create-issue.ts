import { Environment } from '#shared/constants.js'
import type { CurlTicketClient } from '../api-client.js'
import type { CreateIssuePayload, IssueResponse } from '../types.js'
import {
  ValidationError,
  validateProjectId,
  normalizeType,
  normalizeStatus,
  normalizeEnvironment,
  Prompter
} from '../utils.js'

interface CreateIssueOptions {
  type?: string
  curl?: string
  title?: string
  description?: string
  env?: string
  status?: string
}

const TITLE_MAX_LENGTH = 200

function extractUrlPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

async function apiBugFlow(
  client: CurlTicketClient,
  projectId: string,
  options: CreateIssueOptions,
  status: string | undefined,
  json: boolean,
  prompter: Prompter | null
): Promise<void> {
  let curl = options.curl
  if (!curl) {
    if (!prompter) {
      throw new ValidationError('--curl is required for api_bug type')
    }
    curl = await prompter.editor('Paste cURL command')
    if (!curl) {
      throw new ValidationError('cURL command cannot be empty.')
    }
  }

  const parsed = await client.parseCurl(curl)
  const { method, url, headers, body } = parsed.data

  const autoTitle = `${method} ${extractUrlPath(url)}`.slice(0, TITLE_MAX_LENGTH)
  const title = options.title ?? autoTitle
  const environment = options.env ? normalizeEnvironment(options.env) : Environment.Dev

  let description = options.description
  if (!description && prompter) {
    const addDesc = await prompter.confirm('Add description?')
    if (addDesc) {
      description = await prompter.editor('Description (Markdown supported)')
    }
  }

  const input: CreateIssuePayload = {
    issueType: 'api_bug',
    title,
    rawCurl: curl,
    method,
    url,
    environment,
    requestHeaders: headers,
    requestBody: body,
    ...(description && { description }),
    ...(status && { status })
  }

  const res = await client.createIssue(projectId, input)
  printResult(res, json)
}

async function taskFlow(
  client: CurlTicketClient,
  projectId: string,
  options: CreateIssueOptions,
  status: string | undefined,
  json: boolean,
  prompter: Prompter | null
): Promise<void> {
  let title = options.title ?? ''
  let description = options.description

  if (!options.title) {
    if (!prompter) {
      throw new ValidationError('--title is required in non-interactive mode')
    }

    title = await prompter.input('Title', {
      validate: (v) => (v ? null : 'Title is required.')
    })

    const addDesc = await prompter.confirm('Add description?')
    if (addDesc) {
      description = await prompter.editor('Description (Markdown supported)')
    }

    process.stderr.write('\n--- Preview ---\n')
    process.stderr.write(`Title: ${title}\n`)
    if (description) {
      process.stderr.write(`Description:\n${description}\n`)
    }
    process.stderr.write('--- End Preview ---\n\n')

    const confirmed = await prompter.confirm('Create this issue?', true)
    if (!confirmed) {
      process.stderr.write('Cancelled.\n')
      return
    }
  }

  const input: CreateIssuePayload = {
    issueType: 'task',
    title,
    ...(description && { description }),
    ...(status && { status })
  }

  const res = await client.createIssue(projectId, input)
  printResult(res, json)
}

function printResult(res: IssueResponse, json: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    return
  }
  console.log(`Issue created: ${res.friendlyId} — ${res.data.title}`)
}

export async function createIssueCommand(
  client: CurlTicketClient,
  projectId: string,
  options: CreateIssueOptions,
  json = false
): Promise<void> {
  validateProjectId(projectId)

  const prompter = process.stdin.isTTY ? new Prompter() : null
  try {
    let issueType: string

    if (options.type) {
      issueType = normalizeType(options.type)
    } else if (prompter) {
      const selected = await prompter.select('Select issue type', ['API Bug', 'Task'])
      issueType = selected === 'API Bug' ? 'api_bug' : 'task'
    } else {
      throw new ValidationError('--type is required in non-interactive mode')
    }

    const status = options.status ? normalizeStatus(options.status) : undefined

    if (issueType === 'api_bug') {
      await apiBugFlow(client, projectId, options, status, json, prompter)
    } else {
      await taskFlow(client, projectId, options, status, json, prompter)
    }
  } finally {
    prompter?.close()
  }
}
