import { z } from 'zod'

// ============================================
// cURL Parse Schema
// ============================================

export const parseCurlSchema = z.object({
  curl: z.string().min(1, 'cURL command is required')
})

export type ParseCurlInput = z.infer<typeof parseCurlSchema>
