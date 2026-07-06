import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

// 使用 lazy singleton 模式，確保只建立一個連線
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDB() {
  if (!_db) {
    const env = useEnv()
    // Serverless（Vercel）：每個 function instance 只需一條連線，避免大量 instance 同時握連線撞 pooler 上限
    const client = postgres(env.databaseUrl, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

type Db = ReturnType<typeof useDB>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Accepts either the singleton DB client or a transaction handle from `db.transaction`. */
export type DbOrTx = Db | Tx

export * from '../database/schema'
