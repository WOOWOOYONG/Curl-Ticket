/** 資料庫唯一性約束違反 (PostgreSQL SQLSTATE) */
export const UNIQUE_VIOLATION_CODE = '23505'

/** 判斷錯誤是否為唯一性約束違反（含 driver 包裝的 cause） */
export function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; cause?: { code?: string } }
  return err?.code === UNIQUE_VIOLATION_CODE || err?.cause?.code === UNIQUE_VIOLATION_CODE
}
