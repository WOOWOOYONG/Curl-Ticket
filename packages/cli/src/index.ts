import { createInterface } from 'node:readline'
import { Command } from 'commander'
import {
  CurlTicketClient,
  ApiError,
  NetworkError,
  TimeoutError,
  RateLimitError
} from './api-client.js'
import { getConfigAsync, getUrlAsync } from './auth/config.js'
import { startDeviceCodeFlow } from './auth/device-flow.js'
import { projectsCommand } from './commands/projects.js'
import { issuesCommand } from './commands/issues.js'
import { issueCommand } from './commands/issue.js'
import { updateStatusCommand } from './commands/update-status.js'
import { commentsCommand } from './commands/comments.js'
import { getCommentCommand } from './commands/get-comment.js'
import { addCommentCommand } from './commands/add-comment.js'
import { editCommentCommand } from './commands/edit-comment.js'
import { deleteCommentCommand } from './commands/delete-comment.js'
import { projectCommand } from './commands/project.js'
import { createProjectCommand } from './commands/create-project.js'
import { membersCommand } from './commands/members.js'
import { deleteIssueCommand } from './commands/delete-issue.js'
import { createIssueCommand } from './commands/create-issue.js'
import { assignCommand } from './commands/assign.js'
import { myIssuesCommand } from './commands/my-issues.js'
import { schemaCommand } from './commands/schema.js'
import { authLoginCommand, authStatusCommand, authLogoutCommand } from './commands/auth.js'
import { initSkillCommand } from './commands/init-skill/index.js'
import { ValidationError } from './utils.js'
import { CLI_NAME, CLI_VERSION, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ExitCode } from './constants.js'
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

interface ErrorInfo {
  code: number | null
  exitCode: ExitCode
  message: string
}

const API_STATUS_MAP: Record<number, ErrorInfo> = {
  401: {
    code: 401,
    exitCode: ExitCode.AuthError,
    message: 'Invalid token. Please regenerate it from the Curl Ticket site.'
  },
  403: { code: 403, exitCode: ExitCode.AuthError, message: 'Access denied for this project.' },
  404: { code: 404, exitCode: ExitCode.NotFound, message: 'Resource not found.' }
}

function resolveError(err: unknown): ErrorInfo {
  if (err instanceof ApiError) {
    return (
      API_STATUS_MAP[err.statusCode] ?? {
        code: err.statusCode,
        exitCode: ExitCode.GeneralError,
        message: `API error (${err.statusCode}): ${err.message}`
      }
    )
  }
  if (err instanceof TimeoutError) {
    return { code: null, exitCode: ExitCode.NetworkError, message: err.message }
  }
  if (err instanceof RateLimitError) {
    return { code: null, exitCode: ExitCode.NetworkError, message: err.message }
  }
  if (err instanceof NetworkError) {
    return { code: null, exitCode: ExitCode.NetworkError, message: err.message }
  }
  if (err instanceof ValidationError) {
    return { code: null, exitCode: ExitCode.ValidationError, message: err.message }
  }
  const message = err instanceof Error ? err.message : 'An unknown error occurred.'
  return { code: null, exitCode: ExitCode.GeneralError, message }
}

function handleError(err: unknown, json = false): never {
  const { code, exitCode, message } = resolveError(err)

  if (json) {
    process.stderr.write(JSON.stringify({ error: true, code, exitCode, message }, null, 2) + '\n')
  } else {
    process.stderr.write(message + '\n')
  }
  process.exit(exitCode)
}

const program = new Command()

program
  .name(CLI_NAME)
  .description('Curl Ticket CLI — query and manage issues from the terminal')
  .version(CLI_VERSION)
  .option('--json', 'Output raw JSON instead of human-readable text')

function isJsonMode(): boolean {
  return program.opts<{ json?: boolean }>().json === true
}

// --- Data commands ---

program
  .command('projects')
  .description('List accessible projects')
  .action(async () => {
    try {
      await withAuth((client) => projectsCommand(client, isJsonMode()))
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('issues <projectId>')
  .description('List issues for a project')
  .option('-s, --status <status>', 'Filter by status (Open / in-progress / Done / Close)')
  .option('-t, --type <type>', 'Filter by type (api_bug / task)')
  .option(
    '-n, --limit <limit>',
    `Max results (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE})`,
    String(DEFAULT_PAGE_SIZE)
  )
  .option('--assignee <value>', 'Filter by assignee (me / none / <uuid> / <email>)')
  .action(
    async (
      projectId: string,
      options: { status?: string; type?: string; limit: string; assignee?: string }
    ) => {
      try {
        await withAuth((client) =>
          issuesCommand(
            client,
            projectId,
            {
              status: options.status,
              type: options.type,
              limit: parseInt(options.limit, 10),
              assignee: options.assignee
            },
            isJsonMode()
          )
        )
      } catch (err) {
        handleError(err, isJsonMode())
      }
    }
  )

program
  .command('project <projectId>')
  .description('View project details')
  .action(async (projectId: string) => {
    try {
      await withAuth((client) => projectCommand(client, projectId, isJsonMode()))
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('create-project')
  .description('Create a new project')
  .requiredOption('--name <name>', 'Project name')
  .requiredOption('--key <key>', 'Project key (short code)')
  .option('--description <description>', 'Project description')
  .action(async (options: { name: string; key: string; description?: string }) => {
    try {
      await withAuth((client) =>
        createProjectCommand(client, options.name, options.key, options.description, isJsonMode())
      )
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('create-issue <projectId>')
  .description('Create a new issue')
  .option('-t, --type <type>', 'Issue type (api_bug / task)')
  .option('--curl <curl>', 'Raw cURL command string (required for api_bug)')
  .option('--title <title>', 'Issue title')
  .option('--description <description>', 'Issue description (Markdown)')
  .option(
    '--env <env>',
    'Environment for api_bug only (Local / Dev / Staging / Prod, defaults to Dev)'
  )
  .option('--status <status>', 'Initial status (Open / in-progress / Done / Close)')
  .option('--assignee <value>', 'Assignee (me / none / <uuid> / <email>)')
  .action(
    async (
      projectId: string,
      options: {
        type?: string
        curl?: string
        title?: string
        description?: string
        env?: string
        status?: string
        assignee?: string
      }
    ) => {
      try {
        await withAuth((client) => createIssueCommand(client, projectId, options, isJsonMode()))
      } catch (err) {
        handleError(err, isJsonMode())
      }
    }
  )

program
  .command('members <projectId>')
  .description('List project members')
  .action(async (projectId: string) => {
    try {
      await withAuth((client) => membersCommand(client, projectId, isJsonMode()))
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('assign <projectId> <issueId> <assignee>')
  .description('Assign an issue to a user (me / none / <uuid> / <email>)')
  .option('--dry-run', 'Preview the assignment without applying it')
  .action(
    async (projectId: string, issueId: string, assignee: string, options: { dryRun?: boolean }) => {
      try {
        await withAuth((client) =>
          assignCommand(client, projectId, issueId, assignee, {
            json: isJsonMode(),
            dryRun: options.dryRun
          })
        )
      } catch (err) {
        handleError(err, isJsonMode())
      }
    }
  )

program
  .command('my-issues')
  .description('List issues assigned to you')
  .option(
    '-s, --status <status>',
    'Filter by status (repeatable: -s Open -s Done)',
    (val, acc: string[]) => acc.concat([val]),
    [] as string[]
  )
  .option('--project <projectId>', 'Filter by project UUID')
  .option('--environment <env>', 'Filter by environment (Local / Dev / Staging / Prod)')
  .option('--search <query>', 'Search by title')
  .option('--sort <field>', 'Sort field (updatedAt / createdAt / status)')
  .option('--order <order>', 'Sort order (asc / desc)')
  .option('--page <n>', 'Page number')
  .option('--page-size <n>', 'Page size')
  .action(
    async (options: {
      status: string[]
      project?: string
      environment?: string
      search?: string
      sort?: string
      order?: string
      page?: string
      pageSize?: string
    }) => {
      try {
        await withAuth((client) =>
          myIssuesCommand(
            client,
            {
              status: options.status.length ? options.status : undefined,
              project: options.project,
              environment: options.environment,
              search: options.search,
              sort: options.sort,
              order: options.order,
              page: options.page,
              pageSize: options.pageSize
            },
            isJsonMode()
          )
        )
      } catch (err) {
        handleError(err, isJsonMode())
      }
    }
  )

program
  .command('issue <projectId> <issueId>')
  .description('Get issue details')
  .option('--fields <fields>', 'Comma-separated list of fields to include (JSON mode only)')
  .action(async (projectId: string, issueId: string, options: { fields?: string }) => {
    try {
      await withAuth((client) =>
        issueCommand(client, projectId, issueId, isJsonMode(), options.fields)
      )
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('update-status <projectId> <issueId> <status>')
  .description('Update issue status')
  .option('--dry-run', 'Preview the update without applying it')
  .action(
    async (projectId: string, issueId: string, status: string, options: { dryRun?: boolean }) => {
      try {
        await withAuth((client) =>
          updateStatusCommand(client, projectId, issueId, status, isJsonMode(), options.dryRun)
        )
      } catch (err) {
        handleError(err, isJsonMode())
      }
    }
  )

program
  .command('delete-issue <projectId> <issueId>')
  .description('Delete an issue')
  .option('--force', 'Skip confirmation prompt')
  .action(async (projectId: string, issueId: string, options: { force?: boolean }) => {
    try {
      await withAuth((client) =>
        deleteIssueCommand(client, projectId, issueId, isJsonMode(), options.force)
      )
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

// --- Comment commands ---

program
  .command('comments <projectId> <issueId>')
  .description('List comments for an issue')
  .action(async (projectId: string, issueId: string) => {
    try {
      await withAuth((client) => commentsCommand(client, projectId, issueId, isJsonMode()))
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('comment <projectId> <issueId> <commentId>')
  .description('Get a single comment')
  .action(async (projectId: string, issueId: string, commentId: string) => {
    try {
      await withAuth((client) =>
        getCommentCommand(client, projectId, issueId, commentId, isJsonMode())
      )
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('add-comment <projectId> <issueId> <content>')
  .description('Add a comment to an issue')
  .action(async (projectId: string, issueId: string, content: string) => {
    try {
      await withAuth((client) =>
        addCommentCommand(client, projectId, issueId, content, isJsonMode())
      )
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('edit-comment <projectId> <issueId> <commentId> <content>')
  .description('Edit a comment')
  .action(async (projectId: string, issueId: string, commentId: string, content: string) => {
    try {
      await withAuth((client) =>
        editCommentCommand(client, projectId, issueId, commentId, content, isJsonMode())
      )
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

program
  .command('delete-comment <projectId> <issueId> <commentId>')
  .description('Delete a comment')
  .option('--force', 'Skip confirmation prompt')
  .action(
    async (projectId: string, issueId: string, commentId: string, options: { force?: boolean }) => {
      try {
        await withAuth((client) =>
          deleteCommentCommand(client, projectId, issueId, commentId, isJsonMode(), options.force)
        )
      } catch (err) {
        handleError(err, isJsonMode())
      }
    }
  )

// --- Schema introspection ---

program
  .command('schema')
  .description('Print CLI schema for agent introspection')
  .action(() => {
    try {
      schemaCommand()
    } catch (err) {
      handleError(err, isJsonMode())
    }
  })

// --- Auth commands ---

const auth = program.command('auth').description('Manage authentication')

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
