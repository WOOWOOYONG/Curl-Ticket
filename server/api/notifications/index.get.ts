import { eq, desc } from 'drizzle-orm'
import { notifications, projectInvitations, projects } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  const list = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      content: notifications.content,
      isRead: notifications.isRead,
      issueId: notifications.issueId,
      projectInvitationId: notifications.projectInvitationId,
      createdAt: notifications.createdAt,
      // project invitation join fields
      invitationProjectId: projectInvitations.projectId,
      invitationStatus: projectInvitations.status,
      projectName: projects.name
    })
    .from(notifications)
    .leftJoin(projectInvitations, eq(notifications.projectInvitationId, projectInvitations.id))
    .leftJoin(projects, eq(projectInvitations.projectId, projects.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  return { data: list }
})
