import { z } from 'zod'

export const createInvitationCodeSchema = z.object({
  expiresAt: z.coerce.date().optional()
})

export const validateInvitationCodeSchema = z.object({
  code: z.string().length(6, '邀請碼為 6 位英數字')
})

export type CreateInvitationCodeInput = z.infer<typeof createInvitationCodeSchema>
export type ValidateInvitationCodeInput = z.infer<typeof validateInvitationCodeSchema>
