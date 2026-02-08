import type { profiles } from '~~/server/database/schema'

declare module 'h3' {
  interface H3EventContext {
    /** 已驗證用戶的 ID (from Supabase JWT sub) */
    userId?: string
    /** 已驗證用戶的 Email */
    userEmail?: string
    /** 用戶 Profile（含角色資訊） */
    profile?: typeof profiles.$inferSelect
  }
}

export {}
