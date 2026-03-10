import { eq, and } from 'drizzle-orm'
import { deviceCodes, apiTokens } from '~~/server/database/schema'
import { generateApiToken } from '~~/server/utils/api-token'

export default defineEventHandler(async (event) => {
  const userId = event.context.profile!.id
  const db = useDB()

  const body = await readBody(event)
  const { userCode } = body || {}

  if (!userCode || typeof userCode !== 'string') {
    badRequest('userCode is required')
  }

  // 查詢 device code 記錄
  const [record] = await db
    .select()
    .from(deviceCodes)
    .where(and(
      eq(deviceCodes.userCode, userCode),
      eq(deviceCodes.status, 'pending')
    ))
    .limit(1)

  if (!record) {
    badRequest('無效或已過期的驗證碼')
  }

  if (record.expiresAt < new Date()) {
    // 標記為過期
    await db.update(deviceCodes)
      .set({ status: 'expired' })
      .where(eq(deviceCodes.id, record.id))
    badRequest('驗證碼已過期，請重新執行 CLI 登入指令')
  }

  // 產生 API Token（name: CLI - {日期}，90 天有效）
  const { token, tokenHash, prefix } = generateApiToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const tokenName = `CLI - ${now.toISOString().slice(0, 10)}`

  // 寫入 api_tokens
  await db.insert(apiTokens).values({
    userId,
    name: tokenName,
    tokenHash,
    prefix,
    expiresAt
  })

  // 更新 device_codes 為 complete，暫存明碼供 CLI 取用一次
  await db.update(deviceCodes)
    .set({
      status: 'complete',
      userId,
      tokenPlaintext: token
    })
    .where(eq(deviceCodes.id, record.id))

  return { success: true }
})
