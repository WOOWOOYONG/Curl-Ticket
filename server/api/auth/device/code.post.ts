import { randomBytes } from 'node:crypto'
import { lt } from 'drizzle-orm'
import { deviceCodes } from '~~/server/database/schema'

// 排除容易混淆的字元：0, O, 1, I, L
const CHAR_SET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateUserCode(): string {
  const bytes = randomBytes(8)
  const chars = Array.from(bytes).map(b => CHAR_SET[b % CHAR_SET.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`
}

export default defineEventHandler(async (event) => {
  const db = useDB()

  // Lazy cleanup：刪除 1 小時前的過期記錄（TOKEN-039）
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  db.delete(deviceCodes)
    .where(lt(deviceCodes.expiresAt, oneHourAgo))
    .catch(() => {})

  const deviceCode = randomBytes(32).toString('hex')
  const userCode = generateUserCode()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 分鐘

  await db.insert(deviceCodes).values({
    deviceCode,
    userCode,
    expiresAt
  })

  const requestUrl = getRequestURL(event)
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`

  return {
    deviceCode,
    userCode,
    verificationUrl: `${baseUrl}/auth/device?code=${userCode}`,
    expiresIn: 300,
    interval: 5
  }
})
