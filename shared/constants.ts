// ============================================
// Issue 類型定義
// ============================================
export const IssueType = {
  ApiBug: 'api_bug',
  Task: 'task'
} as const

export type IssueType = typeof IssueType[keyof typeof IssueType]
export const issueTypes = Object.values(IssueType)

// ============================================
// Environment 環境定義
// ============================================
export const Environment = {
  Local: 'Local',
  Dev: 'Dev',
  Staging: 'Staging',
  Prod: 'Prod'
} as const

export type Environment = typeof Environment[keyof typeof Environment]
export const environments = Object.values(Environment)

// ============================================
// Issue 狀態定義
// ============================================
export const IssueStatus = {
  Open: 'Open',
  InProgress: 'In Progress',
  Done: 'Done',
  Close: 'Close'
} as const

export type IssueStatus = typeof IssueStatus[keyof typeof IssueStatus]
export const issueStatuses = Object.values(IssueStatus)

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

export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus]

// ============================================
// HTTP 方法定義
// ============================================
export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS'
} as const

export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod]
export const httpMethods = Object.values(HttpMethod)

// ============================================
// 用戶角色定義
// ============================================
export const UserRole = {
  Admin: 'admin',
  User: 'user'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]
export const userRoles = Object.values(UserRole)

// ============================================
// 邀請狀態定義
// ============================================
export const InvitationStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Expired: 'expired'
} as const

export type InvitationStatus = typeof InvitationStatus[keyof typeof InvitationStatus]
export const invitationStatuses = Object.values(InvitationStatus)

// ============================================
// 通知類型定義
// ============================================
export const NotificationType = {
  IssueUpdate: 'issue_update',
  ProjectInvite: 'project_invite',
  IssueComment: 'issue_comment'
} as const

export type NotificationType = typeof NotificationType[keyof typeof NotificationType]
export const notificationTypes = Object.values(NotificationType)
