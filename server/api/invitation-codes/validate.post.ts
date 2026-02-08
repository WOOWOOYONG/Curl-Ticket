import { validateInvitationCodeSchema } from '~~/shared/schemas'
import { badRequest } from '~~/server/utils/errors'
import { validateInvitationToken } from '~~/server/utils/invitation-code'

/**
 * POST /api/invitation-codes/validate
 * 公開 API：驗證邀請 token 是否有效
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const body = await readBody(event)

  const result = validateInvitationCodeSchema.safeParse(body)
  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  await validateInvitationToken(db, result.data.code)

  return { valid: true }
})
