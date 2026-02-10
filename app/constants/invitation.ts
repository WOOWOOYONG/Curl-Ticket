import { InvitationStatus } from '~~/shared/constants'

// UBadge 組件支援的顏色類型
export type BadgeColor = 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

// 邀請狀態對應的顏色（用於 UBadge 組件）
export const InvitationStatusColor = {
  [InvitationStatus.Pending]: 'warning',
  [InvitationStatus.Accepted]: 'success',
  [InvitationStatus.Rejected]: 'error',
  [InvitationStatus.Expired]: 'neutral'
} satisfies Record<InvitationStatus, BadgeColor>
