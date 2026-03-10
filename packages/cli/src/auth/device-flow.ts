import { exec } from 'node:child_process'
import { platform } from 'node:os'
import { saveConfig } from './config.js'
import { BROWSER_COMMANDS, DEFAULT_POLL_INTERVAL_SEC } from '../constants.js'
import type { AuthConfig, DeviceCodeResponse, DeviceTokenResponse } from '../types.js'

function openBrowser(url: string): void {
  const cmd = BROWSER_COMMANDS[platform()]
  if (cmd) {
    exec(`${cmd} ${JSON.stringify(url)}`, () => {
      // Silently ignore errors — user can open manually
    })
  }
}

function stderr(msg: string): void {
  process.stderr.write(msg)
}

export async function startDeviceCodeFlow(baseUrl: string): Promise<AuthConfig> {
  stderr('尚未登入 Curl Ticket\n\n')

  const codeRes = await fetch(`${baseUrl}/api/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!codeRes.ok) {
    throw new Error(`無法啟動登入流程 (${codeRes.status})`)
  }

  const codeData = await codeRes.json() as DeviceCodeResponse
  const { deviceCode, verificationUrl, expiresIn, interval } = codeData

  stderr('  正在開啟瀏覽器...\n')
  stderr(`  若瀏覽器未開啟，請手動前往：\n`)
  stderr(`  ${verificationUrl}\n\n`)

  openBrowser(verificationUrl)

  const deadline = Date.now() + expiresIn * 1000
  const pollInterval = (interval || DEFAULT_POLL_INTERVAL_SEC) * 1000

  while (Date.now() < deadline) {
    const remaining = Math.ceil((deadline - Date.now()) / 1000)
    stderr(`\r  等待驗證中... (剩餘 ${remaining} 秒)  `)

    await new Promise(resolve => setTimeout(resolve, pollInterval))

    const tokenRes = await fetch(`${baseUrl}/api/auth/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode })
    })

    if (!tokenRes.ok) {
      continue
    }

    const tokenData = await tokenRes.json() as DeviceTokenResponse

    if (tokenData.status === 'complete' && tokenData.token) {
      const config: AuthConfig = {
        url: tokenData.url || baseUrl,
        token: tokenData.token
      }
      await saveConfig(config)
      stderr('\r\n✓ 登入成功\n\n')
      return config
    }

    if (tokenData.status === 'expired') {
      throw new Error('驗證已逾時，請重新執行指令。')
    }
  }

  throw new Error('驗證已逾時，請重新執行指令。')
}
