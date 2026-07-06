import { invitationCodes } from '~~/server/database/schema'
import { createInvitationCodeSchema } from '~~/shared/schemas'
import { validateBody } from '~~/server/utils/validate'
import { requireAdmin } from '~~/server/utils/profile'
import { generateInvitationToken } from '~~/server/utils/invitation-code'

/**
 * POST /api/invitation-codes
 * Admin 產生邀請連結 token
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  await requireAdmin(db, userId, event)

  const data = await validateBody(event, createInvitationCodeSchema)

  const token = generateInvitationToken()

  const [newCode] = await db
    .insert(invitationCodes)
    .values({
      code: token,
      createdBy: userId,
      expiresAt: data.expiresAt ?? null
    })
    .returning()

  return newCode
})
