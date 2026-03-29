import { IssueStatus, Environment, IssueType, issueTypes } from '~~/shared/constants'

// UBadge 組件支援的顏色類型
type BadgeColor = 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

// Issue 狀態對應的顏色（用於 UBadge 組件）
export const IssueStatusColor: Record<IssueStatus, BadgeColor> = {
  [IssueStatus.Open]: 'error',
  [IssueStatus.InProgress]: 'warning',
  [IssueStatus.Done]: 'success',
  [IssueStatus.Close]: 'neutral'
} as const

// Issue 狀態顯示文案
export const IssueStatusLabel: Record<IssueStatus, string> = {
  [IssueStatus.Open]: 'Open',
  [IssueStatus.InProgress]: 'In Progress',
  [IssueStatus.Done]: 'Done',
  [IssueStatus.Close]: 'Close'
} as const

// Environment 環境對應的顏色（用於 UBadge 組件）
export const EnvironmentColor: Record<Environment, BadgeColor> = {
  [Environment.Local]: 'neutral',
  [Environment.Dev]: 'info',
  [Environment.Staging]: 'warning',
  [Environment.Prod]: 'error'
} as const

// Issue 類型顯示文案
export const IssueTypeLabel: Record<IssueType, string> = {
  [IssueType.ApiBug]: 'API Bug',
  [IssueType.Task]: 'Task'
} as const

// Issue 類型對應的圖示
export const IssueTypeIcon: Record<IssueType, string> = {
  [IssueType.ApiBug]: 'i-lucide-bug',
  [IssueType.Task]: 'i-lucide-book-open-check'
} as const

// Issue 類型對應的顏色
export const IssueTypeColor: Record<IssueType, BadgeColor> = {
  [IssueType.ApiBug]: 'error',
  [IssueType.Task]: 'info'
} as const

// Issue 類型 Tab 選項（用於列表篩選與建立頁面）
export const issueTypeTabs = issueTypes.map((type) => ({
  label: IssueTypeLabel[type],
  value: type,
  icon: IssueTypeIcon[type] as string
}))

// HTTP 狀態碼對應的顏色（用於 UBadge 組件）
export function getHttpStatusCodeColor(code: number | null): BadgeColor {
  if (!code) return 'neutral'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'info'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'error'
  return 'neutral'
}
