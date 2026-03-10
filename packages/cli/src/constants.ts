import { join } from 'node:path'
import { homedir } from 'node:os'

// CLI 應用名稱與版本
export const CLI_NAME = 'curl-ticket'
export const CLI_VERSION = '0.1.0'

// 設定檔路徑
export const CONFIG_DIR = join(homedir(), '.config', CLI_NAME)
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
export const CONFIG_FILE_MODE = 0o600

// 環境變數名稱
export const ENV_URL = 'CURL_TICKET_URL'
export const ENV_TOKEN = 'CURL_TICKET_TOKEN'

// API 預設值
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 20
export const PROJECTS_PAGE_SIZE = 100

// Device Code Flow
export const DEFAULT_POLL_INTERVAL_SEC = 5

// 瀏覽器開啟指令（依平台）
export const BROWSER_COMMANDS: Record<string, string> = {
  darwin: 'open',
  linux: 'xdg-open',
  win32: 'start'
}
