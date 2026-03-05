import { z } from 'zod'

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment cannot exceed 2000 characters')
})

export const commentSchema = z.object({
  id: z.number().int(),
  issueId: z.number().int(),
  authorId: z.uuid(),
  authorName: z.string().nullable(),
  authorEmail: z.string(),
  content: z.string(),
  createdAt: z.coerce.date()
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type Comment = z.infer<typeof commentSchema>
