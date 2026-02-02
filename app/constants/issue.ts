import { IssueStatus } from '~~/shared/constants'

// UBadge 組件支援的顏色類型
type BadgeColor = 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

// Issue 狀態對應的顏色（用於 UBadge 組件）
export const IssueStatusColor: Record<string, BadgeColor> = {
  [IssueStatus.Open]: 'error',
  [IssueStatus.InProgress]: 'warning',
  [IssueStatus.Done]: 'success'
} as const

// Issue 狀態對應的圖示
export const IssueStatusIcon: Record<string, string> = {
  [IssueStatus.Open]: 'i-lucide-circle-dot',
  [IssueStatus.InProgress]: 'i-lucide-loader',
  [IssueStatus.Done]: 'i-lucide-check-circle'
} as const

// HTTP 狀態碼對應的顏色（用於 UBadge 組件）
export function getHttpStatusCodeColor(code: number | null): BadgeColor {
  if (!code) return 'neutral'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'info'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'error'
  return 'neutral'
}
