import { z } from 'zod'

/**
 * Server 端環境變數 Schema
 *
 * 使用 Zod 驗證確保：
 * 1. 必要的環境變數存在
 * 2. 環境變數格式正確
 */
const envSchema = z.object({
  databaseUrl: z
    .string({ message: 'DATABASE_URL is required' })
    .startsWith('postgres', { message: 'DATABASE_URL must be a PostgreSQL connection string' })
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

/**
 * 取得已驗證的環境變數（單例模式）
 *
 * @throws {z.ZodError} 驗證失敗時拋出 Zod 錯誤
 */
export function useEnv(): Env {
  if (_env) return _env

  const config = useRuntimeConfig()

  // 使用 parse() 直接拋出格式化的錯誤訊息
  _env = envSchema.parse({
    databaseUrl: config.databaseUrl
  })

  return _env
}
