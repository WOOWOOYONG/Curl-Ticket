import type { H3Event } from 'h3'
import type { z } from 'zod'
import { badRequest } from '~~/server/utils/errors'

/**
 * 以 Zod schema 驗證任意值，失敗時回 400 並附上白名單化的欄位錯誤
 * （只回 `{ field, message }`，不外洩 Zod 內部 issue 結構）。
 */
export function validate<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value)
  if (!result.success) {
    badRequest('Validation Error', {
      fields: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    })
  }
  return result.data
}

/** 驗證 request body。 */
export async function validateBody<S extends z.ZodType>(
  event: H3Event,
  schema: S
): Promise<z.infer<S>> {
  return validate(schema, await readBody(event))
}

/** 驗證 query string。 */
export function validateQuery<S extends z.ZodType>(event: H3Event, schema: S): z.infer<S> {
  return validate(schema, getQuery(event))
}
