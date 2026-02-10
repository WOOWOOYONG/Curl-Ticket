import { eq } from 'drizzle-orm'
import { projectInvitations, projectMembers, notifications, profiles } from '~~/server/database/schema'
import { respondProjectInvitationSchema } from '~~/shared/schemas'
import { InvitationStatus } from '~~/shared/constants'
import { badRequest, notFound, forbidden } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const invitationId = getRouterParam(event, 'invitationId')
  if (!invitationId) {
    badRequest('Invitation ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  const body = await readBody(event)
  const result = respondProjectInvitationSchema.safeParse(body)
  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const { accept } = result.data

  // 取得邀請
  const [invitation] = await db.select().from(projectInvitations)
    .where(eq(projectInvitations.id, invitationId))
    .limit(1)

  if (!invitation) {
    notFound('邀請不存在')
  }

  if (invitation.status !== InvitationStatus.Pending) {
    badRequest('此邀請已被處理')
  }

  if (invitation.expiresAt && new Date() > invitation.expiresAt) {
    badRequest('邀請已過期')
  }

  // 驗證當前用戶 email === invitation.email
  const [profile] = await db.select().from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  if (!profile || profile.email !== invitation.email) {
    forbidden('你無權回應此邀請')
  }

  if (accept) {
    // 接受邀請
    await db.transaction(async (tx) => {
      await tx.update(projectInvitations)
        .set({ status: InvitationStatus.Accepted, acceptedAt: new Date() })
        .where(eq(projectInvitations.id, invitationId))

      await tx.insert(projectMembers).values({
        projectId: invitation.projectId,
        userId
      }).onConflictDoNothing()

      await tx.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.projectInvitationId, invitationId))
    })
  } else {
    // 拒絕邀請
    await db.transaction(async (tx) => {
      await tx.update(projectInvitations)
        .set({ status: InvitationStatus.Rejected })
        .where(eq(projectInvitations.id, invitationId))

      await tx.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.projectInvitationId, invitationId))
    })
  }

  return { success: true }
})
