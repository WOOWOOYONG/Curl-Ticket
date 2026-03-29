import { getConfigAsync, getConfigSource, deleteConfig, getUrlAsync } from '../auth/config.js'
import { startDeviceCodeFlow } from '../auth/device-flow.js'

export async function authLoginCommand(url?: string): Promise<void> {
  const baseUrl = url ?? (await getUrlAsync())
  if (!baseUrl) {
    throw new Error(
      'Please specify a site URL with --url or set the CURL_TICKET_URL environment variable.'
    )
  }
  await startDeviceCodeFlow(baseUrl)
}

export async function authStatusCommand(): Promise<void> {
  const config = await getConfigAsync()
  if (!config) {
    console.log('Not logged in')
    console.log('Run: curl-ticket auth login --url <URL>')
    return
  }

  const source = getConfigSource(config)
  console.log(`Source: ${source === 'env' ? 'environment variable' : 'local config file'}`)
  console.log(`Site: ${config.url}`)
  console.log(`Token: ${config.token.slice(0, 11)}...`)
}

export async function authLogoutCommand(): Promise<void> {
  await deleteConfig()
  console.log('Logged out (local config deleted)')
  console.log('To revoke the token, go to Settings → API Tokens on the site.')
}
