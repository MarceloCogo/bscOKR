import { createHash } from 'crypto'

export function hashScimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const [scheme, token] = authorizationHeader.split(' ')
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token.trim()
}
