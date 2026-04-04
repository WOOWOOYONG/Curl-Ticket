import { eq, desc, and, lt, isNotNull } from 'drizzle-orm'
import {
  notifications,
  projectInvitations,
  projects,
  profiles,
  issues
} from '~~/server/database/schema'
import { InvitationStatus } from '~~/shared/constants'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  // 同步當前用戶邀請的過期狀態，避免過期邀請仍顯示 pending
  const [profile] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  if (profile?.email) {
    await db
      .update(projectInvitations)
      .set({ status: InvitationStatus.Expired })
      .where(
        and(
          eq(projectInvitations.email, profile.email),
          eq(projectInvitations.status, InvitationStatus.Pending),
          isNotNull(projectInvitations.expiresAt),
          lt(projectInvitations.expiresAt, new Date())
        )
      )
  }

  const list = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      content: notifications.content,
      isRead: notifications.isRead,
      issueId: notifications.issueId,
      issueProjectId: issues.projectId,
      projectInvitationId: notifications.projectInvitationId,
      createdAt: notifications.createdAt,
      // project invitation join fields
      invitationProjectId: projectInvitations.projectId,
      invitationStatus: projectInvitations.status,
      projectName: projects.name
    })
    .from(notifications)
    .leftJoin(issues, eq(notifications.issueId, issues.id))
    .leftJoin(projectInvitations, eq(notifications.projectInvitationId, projectInvitations.id))
    .leftJoin(projects, eq(projectInvitations.projectId, projects.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  return { data: list }
})
