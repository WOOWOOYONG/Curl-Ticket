import { eq, and } from 'drizzle-orm'
import { notifications } from '~~/server/database/schema'
import { badRequest, notFound } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'notificationId')
  if (!id) {
    badRequest('Notification ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  const [updated] = await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()

  if (!updated) {
    notFound('Notification not found')
  }

  return { data: updated }
})
