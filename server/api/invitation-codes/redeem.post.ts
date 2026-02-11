import { validateInvitationCodeSchema } from '~~/shared/schemas'
import { badRequest } from '~~/server/utils/errors'
import { validateInvitationToken, markInvitationTokenAsUsed } from '~~/server/utils/invitation-code'
import { getOrCreateProfile } from '~~/server/utils/profile'

/**
 * POST /api/invitation-codes/redeem
 * 已登入用戶兌換邀請 token（OAuth callback 後呼叫）
 * 兌換成功後自動建立 profile
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string
  const userEmail = event.context.userEmail as string
  const userMetadata = event.context.userMetadata as Record<string, string> | undefined
  const body = await readBody(event)

  const result = validateInvitationCodeSchema.safeParse(body)
  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const code = await validateInvitationToken(db, result.data.code)
  await markInvitationTokenAsUsed(db, code.id, userId)

  // 兌換成功後建立 profile
  await getOrCreateProfile(db, userId, userEmail, userMetadata?.full_name)

  return { success: true }
})
