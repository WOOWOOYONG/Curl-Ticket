import { z } from 'zod'
import { invitationStatuses } from '../constants'

export const createProjectInvitationSchema = z.object({
  email: z.email('請輸入有效的 Email')
})

export const respondProjectInvitationSchema = z.object({
  accept: z.literal(true)
})

/** 專案邀請資料（列表用） */
export const projectInvitationSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  status: z.enum(invitationStatuses),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  acceptedAt: z.coerce.date().nullable(),
  invitedByName: z.string().nullable()
})

export type CreateProjectInvitationInput = z.infer<typeof createProjectInvitationSchema>
export type RespondProjectInvitationInput = z.infer<typeof respondProjectInvitationSchema>
export type ProjectInvitation = z.infer<typeof projectInvitationSchema>
