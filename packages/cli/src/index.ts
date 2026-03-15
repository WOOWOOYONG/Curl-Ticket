import { createInterface } from 'node:readline'
import { Command } from 'commander'
import { CurlTicketClient, ApiError, NetworkError } from './api-client.js'
import { getConfigAsync, getUrlAsync } from './auth/config.js'
import { startDeviceCodeFlow } from './auth/device-flow.js'
import { projectsCommand } from './commands/projects.js'
import { issuesCommand } from './commands/issues.js'
import { issueCommand } from './commands/issue.js'
import { updateStatusCommand } from './commands/update-status.js'
import { authLoginCommand, authStatusCommand, authLogoutCommand } from './commands/auth.js'
import { initSkillCommand } from './commands/init-skill/index.js'
import { CLI_NAME, CLI_VERSION, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants.js'
import type { AuthConfig } from './types.js'

function promptUrl(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve, reject) => {
    rl.question('Enter your Curl Ticket URL: ', (answer: string) => {
      rl.close()
      const url = answer.trim().replace(/\/$/, '')
      if (!url) {
        reject(new Error('No URL provided, cancelled.'))
      } else {
        resolve(url)
      }
    })
  })
}

async function ensureAuth(): Promise<AuthConfig> {
  const config = await getConfigAsync()
  if (config) return config

  // No config found — try Device Code Flow
  let url = await getUrlAsync()
  if (!url) {
    url = await promptUrl()
  }

  return startDeviceCodeFlow(url)
}

async function withAuth<T>(fn: (client: CurlTicketClient) => Promise<T>): Promise<T> {
  let config = await ensureAuth()
  let client = new CurlTicketClient(config)

  try {
    return await fn(client)
  } catch (err) {
    // On 401, try re-auth once then retry
    if (err instanceof ApiError && err.statusCode === 401) {
      const url = config.url
      try {
        config = await startDeviceCodeFlow(url)
        client = new CurlTicketClient(config)
        return await fn(client)
      } catch {
        throw new Error('Invalid token. Please regenerate it from the Curl Ticket site.')
      }
    }
    throw err
  }
}

function handleError(err: unknown): never {
  if (err instanceof ApiError) {
    switch (err.statusCode) {
      case 401:
        process.stderr.write('Invalid token. Please regenerate it from the Curl Ticket site.\n')
        break
      case 403:
        process.stderr.write('Access denied for this project.\n')
        break
      case 404:
        process.stderr.write('Resource not found.\n')
        break
      default:
        process.stderr.write(`API error (${err.statusCode}): ${err.message}\n`)
    }
  } else if (err instanceof NetworkError) {
    process.stderr.write(`${err.message}\n`)
  } else if (err instanceof Error) {
    process.stderr.write(`${err.message}\n`)
  } else {
    process.stderr.write('An unknown error occurred.\n')
  }
  process.exit(1)
}

const program = new Command()

program
  .name(CLI_NAME)
  .description('Curl Ticket CLI — query and manage issues from the terminal')
  .version(CLI_VERSION)

// --- Data commands ---

program
  .command('projects')
  .description('List accessible projects')
  .action(async () => {
    try {
      await withAuth(client => projectsCommand(client))
    } catch (err) {
      handleError(err)
    }
  })

program
  .command('issues <projectId>')
  .description('List issues for a project')
  .option('-s, --status <status>', 'Filter by status (Open / in-progress / Done / Close)')
  .option('-t, --type <type>', 'Filter by type (api_bug / task)')
  .option('-n, --limit <limit>', `Max results (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE})`, String(DEFAULT_PAGE_SIZE))
  .action(async (projectId: string, options: { status?: string, type?: string, limit: string }) => {
    try {
      await withAuth(client => issuesCommand(client, projectId, {
        status: options.status,
        type: options.type,
        limit: parseInt(options.limit, 10)
      }))
    } catch (err) {
      handleError(err)
    }
  })

program
  .command('issue <projectId> <issueId>')
  .description('Get issue details')
  .action(async (projectId: string, issueId: string) => {
    try {
      await withAuth(client => issueCommand(client, projectId, issueId))
    } catch (err) {
      handleError(err)
    }
  })

program
  .command('update-status <projectId> <issueId> <status>')
  .description('Update issue status')
  .action(async (projectId: string, issueId: string, status: string) => {
    try {
      await withAuth(client => updateStatusCommand(client, projectId, issueId, status))
    } catch (err) {
      handleError(err)
    }
  })

// --- Auth commands ---

const auth = program
  .command('auth')
  .description('Manage authentication')

auth
  .command('login')
  .description('Log in to Curl Ticket')
  .option('--url <url>', 'Site URL')
  .action(async (options: { url?: string }) => {
    try {
      await authLoginCommand(options.url)
    } catch (err) {
      handleError(err)
    }
  })

auth
  .command('status')
  .description('Show current login status')
  .action(async () => {
    try {
      await authStatusCommand()
    } catch (err) {
      handleError(err)
    }
  })

auth
  .command('logout')
  .description('Log out and delete local config')
  .action(async () => {
    try {
      await authLogoutCommand()
    } catch (err) {
      handleError(err)
    }
  })

// --- Init Skill ---

program
  .command('init-skill')
  .description('Initialize coding agent skill files')
  .action(async () => {
    try {
      await initSkillCommand()
    } catch (err) {
      handleError(err)
    }
  })

program.parse()
