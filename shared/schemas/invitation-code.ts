import { z } from 'zod'

export const createInvitationCodeSchema = z.object({
  expiresAt: z.coerce.date().optional()
})

export const validateInvitationCodeSchema = z.object({
  code: z.string().min(1, '請提供邀請碼')
})

export type CreateInvitationCodeInput = z.infer<typeof createInvitationCodeSchema>
export type ValidateInvitationCodeInput = z.infer<typeof validateInvitationCodeSchema>
