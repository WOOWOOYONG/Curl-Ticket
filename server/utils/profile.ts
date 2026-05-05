import type { H3Event } from 'h3'
import { and, eq, isNull } from 'drizzle-orm'
import { profiles } from '~~/server/database/schema'
import { forbidden } from '~~/server/utils/errors'

/**
 * 檢查用戶是否為 Admin，不是就 throw 403
 * 優先使用 event.context.profile（middleware 已查詢），避免重複查 DB
 */
export async function requireAdmin(db: DbOrTx, userId: string, event?: H3Event) {
  const profile = event?.context.profile ?? (await getProfile(db, userId))

  if (profile?.role !== 'admin') {
    forbidden('需要管理員權限')
  }
}

/**
 * 查詢用戶 Profile（只查詢，不建立）
 */
export async function getProfile(db: DbOrTx, userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, userId), isNull(profiles.deletedAt)))
    .limit(1)

  return profile ?? null
}

/**
 * 取得或建立用戶 Profile（僅在 redeem 邀請碼時使用）
 */
export async function getOrCreateProfile(db: DbOrTx, userId: string, email: string, name?: string) {
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)

  if (existing) {
    if (existing.deletedAt) {
      const [restored] = await db
        .update(profiles)
        .set({ deletedAt: null, email, name: name ?? existing.name, updatedAt: new Date() })
        .where(eq(profiles.id, userId))
        .returning()
      return restored!
    }
    return existing
  }

  const [newProfile] = await db
    .insert(profiles)
    .values({
      id: userId,
      email,
      name: name ?? null,
      role: 'user'
    })
    .onConflictDoNothing()
    .returning()

  return (
    newProfile ?? (await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1))[0]!
  )
}

/**
 * 依 Email 查找 Profile
 */
export async function getProfileByEmail(db: DbOrTx, email: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.email, email), isNull(profiles.deletedAt)))
    .limit(1)

  return profile ?? null
}
