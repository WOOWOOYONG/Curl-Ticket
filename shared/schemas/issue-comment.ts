import { z } from 'zod'
import { COMMENT_MAX_LENGTH } from '../constants'

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(COMMENT_MAX_LENGTH, `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`)
})

export const updateCommentSchema = createCommentSchema

export const commentSchema = z.object({
  id: z.number().int(),
  issueId: z.number().int(),
  authorId: z.uuid(),
  authorName: z.string().nullable(),
  authorEmail: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable()
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>
export type Comment = z.infer<typeof commentSchema>
