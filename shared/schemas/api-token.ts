import { z } from 'zod'

export const createTokenSchema = z.object({
  name: z.string().min(1, '名稱不可為空').max(100, '名稱不可超過 100 字'),
  expiresInDays: z.number().int().min(1).max(365).nullish()
})

export const tokenSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  prefix: z.string(),
  lastUsedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date()
})

export const createTokenResponseSchema = tokenSchema.extend({
  token: z.string(),
  message: z.string()
})

export type CreateTokenInput = z.infer<typeof createTokenSchema>
export type Token = z.infer<typeof tokenSchema>
export type CreateTokenResponse = z.infer<typeof createTokenResponseSchema>
