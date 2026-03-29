import { z } from 'zod'
import { PROFILE_NAME_MAX_LENGTH } from '../constants'

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(PROFILE_NAME_MAX_LENGTH, `Name must be ${PROFILE_NAME_MAX_LENGTH} characters or less`)
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
