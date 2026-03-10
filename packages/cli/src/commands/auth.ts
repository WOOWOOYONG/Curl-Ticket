import { getConfigAsync, getConfigSource, deleteConfig, getUrlAsync } from '../auth/config.js'
import { startDeviceCodeFlow } from '../auth/device-flow.js'

export async function authLoginCommand(url?: string): Promise<void> {
  const baseUrl = url ?? await getUrlAsync()
  if (!baseUrl) {
    throw new Error('請以 --url 參數指定站台網址，或設定環境變數 CURL_TICKET_URL。')
  }
  await startDeviceCodeFlow(baseUrl)
}

export async function authStatusCommand(): Promise<void> {
  const config = await getConfigAsync()
  if (!config) {
    console.log('未登入')
    console.log('執行 curl-ticket auth login --url <URL> 來登入。')
    return
  }

  const source = getConfigSource(config)
  console.log(`來源: ${source === 'env' ? '環境變數' : '本地 config 檔'}`)
  console.log(`站台: ${config.url}`)
  console.log(`Token: ${config.token.slice(0, 11)}...`)
}

export async function authLogoutCommand(): Promise<void> {
  await deleteConfig()
  console.log('已登出（本地 config 已刪除）')
  console.log('如需撤銷 Token，請至站台 設定 → API Tokens 操作。')
}
