import { eq, and } from 'drizzle-orm'
import { projectInvitations, projectMembers, notifications } from '~~/server/database/schema'
import { createProjectInvitationSchema } from '~~/shared/schemas'
import { InvitationStatus, NotificationType } from '~~/shared/constants'
import { badRequest, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { getProfileByEmail } from '~~/server/utils/profile'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  // 驗證當前用戶是 project owner
  const project = await getAccessibleProject(db, projectId, userId)
  if (project.ownerId !== userId) {
    forbidden('只有專案擁有者可以邀請成員')
  }

  const body = await readBody(event)
  const result = createProjectInvitationSchema.safeParse(body)
  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const { email } = result.data

  // 驗證 email 已註冊
  const targetProfile = await getProfileByEmail(db, email)
  if (!targetProfile) {
    badRequest('該 Email 尚未註冊')
  }

  // 不能邀請自己
  if (targetProfile.id === userId) {
    badRequest('不能邀請自己')
  }

  // 檢查是否已是成員
  const [existingMember] = await db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetProfile.id)))
    .limit(1)
  if (existingMember) {
    badRequest('該用戶已是專案成員')
  }

  // 檢查是否已有 pending 邀請
  const [existingInvitation] = await db.select().from(projectInvitations)
    .where(and(
      eq(projectInvitations.projectId, projectId),
      eq(projectInvitations.email, email),
      eq(projectInvitations.status, InvitationStatus.Pending)
    ))
    .limit(1)
  if (existingInvitation) {
    badRequest('已有待處理的邀請')
  }

  // Transaction: 建立邀請 + 通知
  const invitation = await db.transaction(async (tx) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [newInvitation] = await tx.insert(projectInvitations).values({
      projectId,
      email,
      invitedBy: userId,
      status: InvitationStatus.Pending,
      expiresAt
    }).returning()

    await tx.insert(notifications).values({
      userId: targetProfile.id,
      type: NotificationType.ProjectInvite,
      projectInvitationId: newInvitation!.id,
      title: '專案邀請',
      content: `你被邀請加入專案「${project.name}」`
    })

    return newInvitation
  })

  return { data: invitation }
})
