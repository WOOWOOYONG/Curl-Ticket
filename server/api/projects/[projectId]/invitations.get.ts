import { eq, and, desc, lt, isNotNull } from 'drizzle-orm'
import { projectInvitations, profiles } from '~~/server/database/schema'
import { InvitationStatus } from '~~/shared/constants'
import { badRequest, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  const project = await getAccessibleProject(db, projectId, userId)
  if (project.ownerId !== userId) {
    forbidden('只有專案擁有者可以查看邀請列表')
  }

  // 讀取前先同步過期狀態，確保列表顯示正確
  await db.update(projectInvitations)
    .set({ status: InvitationStatus.Expired })
    .where(and(
      eq(projectInvitations.projectId, projectId),
      eq(projectInvitations.status, InvitationStatus.Pending),
      isNotNull(projectInvitations.expiresAt),
      lt(projectInvitations.expiresAt, new Date())
    ))

  const invitations = await db
    .select({
      id: projectInvitations.id,
      email: projectInvitations.email,
      status: projectInvitations.status,
      expiresAt: projectInvitations.expiresAt,
      createdAt: projectInvitations.createdAt,
      acceptedAt: projectInvitations.acceptedAt,
      invitedByName: profiles.name
    })
    .from(projectInvitations)
    .leftJoin(profiles, eq(projectInvitations.invitedBy, profiles.id))
    .where(eq(projectInvitations.projectId, projectId))
    .orderBy(desc(projectInvitations.createdAt))
    .limit(100)

  return { data: invitations }
})
