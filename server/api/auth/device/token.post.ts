import { eq } from 'drizzle-orm'
import { deviceCodes } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { deviceCode } = body || {}

  if (!deviceCode || typeof deviceCode !== 'string') {
    badRequest('deviceCode is required')
  }

  const db = useDB()
  const [record] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.deviceCode, deviceCode))
    .limit(1)

  if (!record) {
    return { status: 'expired' }
  }

  if (record.expiresAt < new Date()) {
    return { status: 'expired' }
  }

  if (record.status === 'pending') {
    return { status: 'pending' }
  }

  if (record.status === 'complete' && record.tokenPlaintext) {
    // Token 僅回傳一次（TOKEN-031）：回傳後標記為 consumed 並清除明碼
    await db.update(deviceCodes)
      .set({ status: 'consumed', tokenPlaintext: null })
      .where(eq(deviceCodes.id, record.id))

    return {
      status: 'complete',
      token: record.tokenPlaintext
    }
  }

  return { status: 'consumed' }
})
