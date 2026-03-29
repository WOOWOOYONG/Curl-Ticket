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
  stderr('Not logged in to Curl Ticket\n\n')

  const codeRes = await fetch(`${baseUrl}/api/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!codeRes.ok) {
    throw new Error(`Failed to start login flow (${codeRes.status})`)
  }

  const codeData = (await codeRes.json()) as DeviceCodeResponse
  const { deviceCode, verificationUrl, expiresIn, interval } = codeData

  stderr('  Opening browser...\n')
  stderr('  If the browser did not open, go to:\n')
  stderr(`  ${verificationUrl}\n\n`)

  openBrowser(verificationUrl)

  const deadline = Date.now() + expiresIn * 1000
  const pollInterval = (interval || DEFAULT_POLL_INTERVAL_SEC) * 1000

  while (Date.now() < deadline) {
    const remaining = Math.ceil((deadline - Date.now()) / 1000)
    stderr(`\r  Waiting for verification... (${remaining}s remaining)  `)

    await new Promise((resolve) => setTimeout(resolve, pollInterval))

    const tokenRes = await fetch(`${baseUrl}/api/auth/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode })
    })

    if (!tokenRes.ok) {
      continue
    }

    const tokenData = (await tokenRes.json()) as DeviceTokenResponse

    if (tokenData.status === 'complete' && tokenData.token) {
      const config: AuthConfig = {
        url: tokenData.url || baseUrl,
        token: tokenData.token
      }
      await saveConfig(config)
      stderr('\r\n✓ Login successful\n\n')
      return config
    }

    if (tokenData.status === 'expired') {
      throw new Error('Verification timed out. Please try again.')
    }
  }

  throw new Error('Verification timed out. Please try again.')
}
