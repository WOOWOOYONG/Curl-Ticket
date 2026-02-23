import { serverSupabaseClient } from '#supabase/server'
import { badRequest, forbidden, internalServerError } from '~~/server/utils/errors'

function getSafeRedirect(input: unknown): string {
  if (typeof input !== 'string' || input.length === 0) return '/'
  if (!input.startsWith('/')) {
    badRequest('redirect must start with "/"')
  }
  return input
}

function getQueryValue(input: unknown): string | undefined {
  if (typeof input === 'string') return input
  if (Array.isArray(input) && typeof input[0] === 'string') return input[0]
  return undefined
}

/**
 * GET /api/dev/login
 * 僅限 local 開發：使用預設測試帳號做 server-side sign-in，並導向指定頁面。
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    forbidden('Not available outside development mode')
  }

  const config = useRuntimeConfig(event)
  const email = config.devLoginEmail
  const password = config.devLoginPassword
  const requiredKey = config.devLoginKey

  if (!email || !password) {
    internalServerError('DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD is not configured')
  }

  const query = getQuery(event)
  const redirectTo = getSafeRedirect(query.redirect)

  if (requiredKey) {
    const keyFromQuery = getQueryValue(query.key)
    const keyFromHeader = getHeader(event, 'x-dev-login-key')
    const providedKey = keyFromHeader ?? keyFromQuery

    if (!providedKey || providedKey !== requiredKey) {
      forbidden('Invalid dev login key')
    }
  }

  const supabase = await serverSupabaseClient(event)
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    badRequest(`Dev login failed: ${error.message}`)
  }

  return sendRedirect(event, redirectTo, 302)
})
