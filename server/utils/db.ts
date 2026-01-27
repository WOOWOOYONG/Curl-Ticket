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

export * from '../database/schema'
