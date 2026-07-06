import { validateInvitationCodeSchema } from '~~/shared/schemas'
import { validateBody } from '~~/server/utils/validate'
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

  const data = await validateBody(event, validateInvitationCodeSchema)

  const code = await validateInvitationToken(db, data.code)

  // 必須先建 profile 再標記 used_by，否則 invitation_codes.used_by → profiles.id
  // FK 約束會失敗。包進 transaction 確保兩步皆成功或一起 rollback。
  await db.transaction(async (tx) => {
    await getOrCreateProfile(tx, userId, userEmail, userMetadata?.full_name)
    await markInvitationTokenAsUsed(tx, code.id, userId)
  })

  return { success: true }
})
