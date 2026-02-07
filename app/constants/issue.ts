import { IssueStatus, Environment } from '~~/shared/constants'

// UBadge 組件支援的顏色類型
type BadgeColor = 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

// Issue 狀態對應的顏色（用於 UBadge 組件）
export const IssueStatusColor: Record<string, BadgeColor> = {
  [IssueStatus.Open]: 'error',
  [IssueStatus.InProgress]: 'warning',
  [IssueStatus.Done]: 'success'
} as const

// Environment 環境對應的顏色（用於 UBadge 組件）
export const EnvironmentColor: Record<string, BadgeColor> = {
  [Environment.Local]: 'neutral',
  [Environment.Dev]: 'info',
  [Environment.Staging]: 'warning',
  [Environment.Prod]: 'error'
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
