// ============================================
// Issue 類型定義
// ============================================
export const issueTypes = ['api_bug', 'task'] as const
export type IssueType = (typeof issueTypes)[number]
export const IssueType = {
  ApiBug: 'api_bug',
  Task: 'task'
} as const satisfies Record<string, IssueType>

// ============================================
// Environment 環境定義
// ============================================
export const environments = ['Local', 'Dev', 'Staging', 'Prod'] as const
export type Environment = (typeof environments)[number]
export const Environment = {
  Local: 'Local',
  Dev: 'Dev',
  Staging: 'Staging',
  Prod: 'Prod'
} as const satisfies Record<string, Environment>

// ============================================
// Issue 狀態定義
// ============================================
export const issueStatuses = ['Open', 'In Progress', 'Done', 'Close'] as const
export type IssueStatus = (typeof issueStatuses)[number]
export const IssueStatus = {
  Open: 'Open',
  InProgress: 'In Progress',
  Done: 'Done',
  Close: 'Close'
} as const satisfies Record<string, IssueStatus>

// ============================================
// HTTP 狀態碼定義
// ============================================
export const HttpStatus = {
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  InternalServerError: 500
} as const

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus]

// ============================================
// HTTP 方法定義
// ============================================
export const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
export type HttpMethod = (typeof httpMethods)[number]
export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS'
} as const satisfies Record<string, HttpMethod>

// ============================================
// 用戶角色定義
// ============================================
export const userRoles = ['admin', 'user'] as const
export type UserRole = (typeof userRoles)[number]
export const UserRole = {
  Admin: 'admin',
  User: 'user'
} as const satisfies Record<string, UserRole>

// ============================================
// 邀請狀態定義
// ============================================
export const invitationStatuses = ['pending', 'accepted', 'rejected', 'expired'] as const
export type InvitationStatus = (typeof invitationStatuses)[number]
export const InvitationStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Expired: 'expired'
} as const satisfies Record<string, InvitationStatus>

// ============================================
// 通知類型定義
// ============================================
export const NotificationType = {
  IssueUpdate: 'issue_update',
  ProjectInvite: 'project_invite',
  IssueComment: 'issue_comment'
} as const

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]
export const notificationTypes = Object.values(NotificationType)

// ============================================
// 留言限制
// ============================================
export const COMMENT_MAX_LENGTH = 5000

// ============================================
// Profile 限制
// ============================================
export const PROFILE_NAME_MAX_LENGTH = 50

// ============================================
// 敏感 Header 關鍵字（用於遮罩顯示）
// ============================================
export const SensitiveHeaderKeywords = [
  'authorization',
  'x-api-key',
  'api-key',
  'token',
  'secret'
] as const

export type SensitiveHeaderKeyword = (typeof SensitiveHeaderKeywords)[number]

// ============================================
// 語系（i18n Locales）
// ============================================
export const AppLocales = ['en', 'zh-TW'] as const
export type AppLocale = (typeof AppLocales)[number]

// ============================================
// cURL 簡化時移除的 Header（瀏覽器/噪音 Header）
// ============================================
export const CurlNoiseHeaders = [
  'user-agent',
  'accept-language',
  'accept-encoding',
  'cookie',
  'cache-control',
  'connection',
  'upgrade-insecure-requests'
] as const
