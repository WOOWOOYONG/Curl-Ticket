import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

// 使用 lazy singleton 模式，確保只建立一個連線
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDB() {
  if (!_db) {
    const env = useEnv()
    const client = postgres(env.databaseUrl, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}

/**
 * Drizzle DB client（一般查詢用）
 */
export type DbClient = ReturnType<typeof useDB>

/**
 * Drizzle transaction object（從 db.transaction 的 callback 取出的型別）
 */
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0]

/**
 * 接受一般 db 或 transaction tx 的通用型別。
 * 共用 helper 函式應使用此型別，便於同時被 transaction 內外呼叫。
 */
export type DbOrTx = DbClient | DbTransaction

export * from '../database/schema'
