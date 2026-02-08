import { validateInvitationCodeSchema } from '~~/shared/schemas'
import { badRequest } from '~~/server/utils/errors'
import { validateInvitationToken, markInvitationTokenAsUsed } from '~~/server/utils/invitation-code'

/**
 * POST /api/invitation-codes/redeem
 * 已登入用戶兌換邀請 token（OAuth callback 後呼叫）
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string
  const body = await readBody(event)

  const result = validateInvitationCodeSchema.safeParse(body)
  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const code = await validateInvitationToken(db, result.data.code)
  await markInvitationTokenAsUsed(db, code.id, userId)

  return { success: true }
})
