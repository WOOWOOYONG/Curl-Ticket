import type { InvitationStatus, NotificationType } from '../constants'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  content: string | null
  isRead: boolean
  issueId: number | null
  issueProjectId: string | null
  projectInvitationId: string | null
  createdAt: string
  invitationProjectId: string | null
  invitationStatus: InvitationStatus | null
  projectName: string | null
}
