import { z } from 'zod'

export default defineNitroPlugin(() => {
  // 在 server 啟動時驗證環境變數（Fail Fast）
  try {
    useEnv()
    console.log('✅ Environment variables validated')
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:\n' + z.prettifyError(error))
    } else {
      console.error(error)
    }
    process.exit(1)
  }
})
