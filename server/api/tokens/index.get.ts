import { eq } from 'drizzle-orm'
import { apiTokens } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  if (event.context.authMethod === 'api_token') {
    forbidden('Token-based access not allowed for token management')
  }

  const userId = event.context.profile!.id
  const db = useDB()

  const tokens = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      expiresAt: apiTokens.expiresAt,
      createdAt: apiTokens.createdAt
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(apiTokens.createdAt)

  return tokens
})
