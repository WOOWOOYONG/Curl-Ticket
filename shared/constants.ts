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
  Done: 'Done'
} as const

export type IssueStatus = typeof IssueStatus[keyof typeof IssueStatus]
export const issueStatuses = Object.values(IssueStatus)

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
  Expired: 'expired'
} as const

export type InvitationStatus = typeof InvitationStatus[keyof typeof InvitationStatus]
export const invitationStatuses = Object.values(InvitationStatus)
