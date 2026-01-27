import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// 建立 postgres 連線
const connectionString = process.env.DATABASE_URL!

// 用於查詢的連線 (connection pool)
const client = postgres(connectionString, { prepare: false })

// 建立 drizzle 實例
export const db = drizzle(client, { schema })

export * from './schema'
