import { and, eq } from 'drizzle-orm'
import { notifications } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id })

  return {
    data: {
      updatedCount: updated.length
    }
  }
})
