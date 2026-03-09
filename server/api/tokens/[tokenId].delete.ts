import { and, eq } from 'drizzle-orm'
import { apiTokens } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  if (event.context.authMethod === 'api_token') {
    forbidden('Token-based access not allowed for token management')
  }

  const userId = event.context.profile!.id
  const tokenId = getRouterParam(event, 'tokenId')

  if (!tokenId) {
    badRequest('Token ID 不可為空')
  }

  const db = useDB()
  const deleted = await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, tokenId!), eq(apiTokens.userId, userId)))
    .returning({ id: apiTokens.id })

  if (deleted.length === 0) {
    notFound('找不到指定的 Token')
  }

  return { message: 'Token 已撤銷' }
})
