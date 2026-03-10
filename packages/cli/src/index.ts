import { Command } from 'commander'
import { CurlTicketClient, ApiError, NetworkError } from './api-client.js'
import { getConfigAsync, getUrlAsync } from './auth/config.js'
import { startDeviceCodeFlow } from './auth/device-flow.js'
import { projectsCommand } from './commands/projects.js'
import { issuesCommand } from './commands/issues.js'
import { issueCommand } from './commands/issue.js'
import { updateStatusCommand } from './commands/update-status.js'
import { authLoginCommand, authStatusCommand, authLogoutCommand } from './commands/auth.js'
import { initSkillCommand } from './commands/init-skill.js'
import { CLI_NAME, CLI_VERSION, ENV_URL, ENV_TOKEN, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants.js'
import type { AuthConfig } from './types.js'

async function ensureAuth(): Promise<AuthConfig> {
  const config = await getConfigAsync()
  if (config) return config

  // No config found — try Device Code Flow
  const url = await getUrlAsync()
  if (!url) {
    process.stderr.write(
      `找不到設定。請執行 ${CLI_NAME} auth login --url <URL> 或設定環境變數 ${ENV_URL} + ${ENV_TOKEN}。\n`
    )
    return process.exit(1) as never
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
        throw new Error('Token 無效，請至 Curl Ticket 站台重新產生。')
      }
    }
    throw err
  }
}

function handleError(err: unknown): never {
  if (err instanceof ApiError) {
    switch (err.statusCode) {
      case 401:
        process.stderr.write('Token 無效，請至 Curl Ticket 站台重新產生。\n')
        break
      case 403:
        process.stderr.write('無權限存取此專案。\n')
        break
      case 404:
        process.stderr.write('找不到指定的資源。\n')
        break
      default:
        process.stderr.write(`API 錯誤 (${err.statusCode}): ${err.message}\n`)
    }
  } else if (err instanceof NetworkError) {
    process.stderr.write(`${err.message}\n`)
  } else if (err instanceof Error) {
    process.stderr.write(`${err.message}\n`)
  } else {
    process.stderr.write('發生未知錯誤。\n')
  }
  process.exit(1)
}

const program = new Command()

program
  .name(CLI_NAME)
  .description('Curl Ticket CLI — 從終端機查詢與管理 issue')
  .version(CLI_VERSION)

// --- Data commands ---

program
  .command('projects')
  .description('列出可存取的專案')
  .action(async () => {
    try {
      await withAuth(client => projectsCommand(client))
    } catch (err) {
      handleError(err)
    }
  })

program
  .command('issues <projectId>')
  .description('列出指定專案的 issue')
  .option('-s, --status <status>', '依狀態過濾 (Open / in-progress / Done / Close)')
  .option('-t, --type <type>', '依類型過濾 (api_bug / task)')
  .option('-n, --limit <limit>', `筆數上限 (預設 ${DEFAULT_PAGE_SIZE}, 最大 ${MAX_PAGE_SIZE})`, String(DEFAULT_PAGE_SIZE))
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
  .description('取得單一 issue 詳情')
  .action(async (projectId: string, issueId: string) => {
    try {
      await withAuth(client => issueCommand(client, projectId, issueId))
    } catch (err) {
      handleError(err)
    }
  })

program
  .command('update-status <projectId> <issueId> <status>')
  .description('更新 issue 狀態')
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
  .description('管理登入狀態')

auth
  .command('login')
  .description('登入 Curl Ticket')
  .option('--url <url>', '站台網址')
  .action(async (options: { url?: string }) => {
    try {
      await authLoginCommand(options.url)
    } catch (err) {
      handleError(err)
    }
  })

auth
  .command('status')
  .description('顯示當前登入狀態')
  .action(async () => {
    try {
      await authStatusCommand()
    } catch (err) {
      handleError(err)
    }
  })

auth
  .command('logout')
  .description('登出並刪除本地 config')
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
  .description('初始化 Claude Code Skill 檔案')
  .action(async () => {
    try {
      await initSkillCommand()
    } catch (err) {
      handleError(err)
    }
  })

program.parse()
