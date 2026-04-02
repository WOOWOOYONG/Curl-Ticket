import { z } from 'zod'

export const createInvitationCodeSchema = z.object({
  expiresAt: z.coerce.date().optional()
})

export const validateInvitationCodeSchema = z.object({
  code: z.string().length(6, 'Invitation code must be 6 alphanumeric characters')
})

export type CreateInvitationCodeInput = z.infer<typeof createInvitationCodeSchema>
export type ValidateInvitationCodeInput = z.infer<typeof validateInvitationCodeSchema>
