import { eq } from 'drizzle-orm'
import { apiTokens } from '~~/server/database/schema'
import { createTokenSchema } from '~~/shared/schemas/api-token'
import { generateApiToken } from '~~/server/utils/api-token'

const MAX_TOKENS_PER_USER = 5

export default defineEventHandler(async (event) => {
  if (event.context.authMethod === 'api_token') {
    forbidden('Token-based access not allowed for token management')
  }

  const userId = event.context.profile!.id
  const db = useDB()
  const body = await readValidatedBody(event, createTokenSchema.parse)

  // 檢查 Token 數量上限（TOKEN-017）
  const existing = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))

  if (existing.length >= MAX_TOKENS_PER_USER) {
    badRequest(`每位使用者最多 ${MAX_TOKENS_PER_USER} 組有效 Token`)
  }

  // 產生 Token：ct_ + 64 字元 hex（TOKEN-006）
  const { token: tokenPlaintext, tokenHash, prefix } = generateApiToken()

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const [token] = await db
    .insert(apiTokens)
    .values({ userId, name: body.name, tokenHash, prefix, expiresAt })
    .returning()

  // 明碼僅在此回傳一次（TOKEN-007、TOKEN-015）
  return {
    token: tokenPlaintext,
    message: '請立即複製此 Token，關閉後將無法再次查看。',
    id: token!.id,
    name: token!.name,
    prefix: token!.prefix,
    lastUsedAt: token!.lastUsedAt,
    expiresAt: token!.expiresAt,
    createdAt: token!.createdAt
  }
})
