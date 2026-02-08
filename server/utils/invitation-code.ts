import { eq, and } from 'drizzle-orm'
import { invitationCodes } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'

/**
 * 產生 URL-safe 的唯一邀請 token
 * 格式：26 字元大小寫英數字
 */
export function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(
    { length: 26 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

/**
 * 驗證邀請 token 是否有效（未使用、未過期）
 * 無效則 throw BadRequest
 */
export async function validateInvitationToken(db: ReturnType<typeof useDB>, token: string) {
  const [code] = await db
    .select()
    .from(invitationCodes)
    .where(
      and(
        eq(invitationCodes.code, token),
        eq(invitationCodes.isUsed, false)
      )
    )
    .limit(1)

  if (!code) {
    badRequest('邀請連結無效或已被使用')
  }

  if (code.expiresAt && new Date() > code.expiresAt) {
    badRequest('邀請連結已過期')
  }

  return code
}

/**
 * 標記邀請 token 為已使用
 */
export async function markInvitationTokenAsUsed(
  db: ReturnType<typeof useDB>,
  tokenId: string,
  userId: string
) {
  await db
    .update(invitationCodes)
    .set({
      isUsed: true,
      usedBy: userId,
      usedAt: new Date()
    })
    .where(eq(invitationCodes.id, tokenId))
}
