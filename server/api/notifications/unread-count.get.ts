import { eq, and, count } from 'drizzle-orm'
import { notifications } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

  return { data: result?.count ?? 0 }
})
