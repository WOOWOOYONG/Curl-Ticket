import { randomBytes, createHash } from 'node:crypto'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateApiToken(): { token: string; tokenHash: string; prefix: string } {
  const token = `ct_${randomBytes(32).toString('hex')}`
  const tokenHash = hashToken(token)
  const prefix = token.slice(0, 11)
  return { token, tokenHash, prefix }
}
