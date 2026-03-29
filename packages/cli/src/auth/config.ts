import { readFile, writeFile, mkdir, unlink, chmod } from 'node:fs/promises'
import type { AuthConfig } from '../types.js'
import { CONFIG_DIR, CONFIG_FILE, CONFIG_FILE_MODE, ENV_URL, ENV_TOKEN } from '../constants.js'

export function getConfigFromEnv(): AuthConfig | null {
  const url = process.env[ENV_URL]
  const token = process.env[ENV_TOKEN]
  if (url && token) {
    return { url: url.replace(/\/$/, ''), token }
  }
  return null
}

export async function getConfigFromFile(): Promise<AuthConfig | null> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(content) as AuthConfig
    if (config.url && config.token) {
      return { url: config.url.replace(/\/$/, ''), token: config.token }
    }
    return null
  } catch {
    return null
  }
}

export async function saveConfig(config: AuthConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  await chmod(CONFIG_FILE, CONFIG_FILE_MODE)
}

export async function deleteConfig(): Promise<void> {
  try {
    await unlink(CONFIG_FILE)
  } catch {
    // File doesn't exist, that's fine
  }
}

export function getConfig(): AuthConfig | null {
  return getConfigFromEnv()
}

export async function getConfigAsync(): Promise<AuthConfig | null> {
  return getConfigFromEnv() ?? (await getConfigFromFile())
}

export function getUrl(): string | null {
  return process.env[ENV_URL]?.replace(/\/$/, '') ?? null
}

export async function getUrlAsync(): Promise<string | null> {
  const envUrl = getUrl()
  if (envUrl) return envUrl
  const config = await getConfigFromFile()
  return config?.url ?? null
}

export function getConfigSource(config: AuthConfig): 'env' | 'file' {
  const envConfig = getConfigFromEnv()
  if (envConfig && envConfig.url === config.url && envConfig.token === config.token) {
    return 'env'
  }
  return 'file'
}
