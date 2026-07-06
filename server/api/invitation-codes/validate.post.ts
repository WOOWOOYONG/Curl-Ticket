import { validateInvitationCodeSchema } from '~~/shared/schemas'
import { validateBody } from '~~/server/utils/validate'
import { validateInvitationToken } from '~~/server/utils/invitation-code'

/**
 * POST /api/invitation-codes/validate
 * 公開 API：驗證邀請 token 是否有效
 */
export default defineEventHandler(async (event) => {
  const db = useDB()

  const data = await validateBody(event, validateInvitationCodeSchema)

  await validateInvitationToken(db, data.code)

  return { valid: true }
})
