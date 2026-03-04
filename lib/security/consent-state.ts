import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

type ConsentStatePayload = {
  tenantSlug: string
  nonce: string
  exp: number
}

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('AUTH secret is not configured')
  }
  return secret
}

function sign(payloadBase64: string) {
  return createHmac('sha256', getSecret()).update(payloadBase64).digest('base64url')
}

export function createConsentState(tenantSlug: string, ttlSeconds = 600) {
  const payload: ConsentStatePayload = {
    tenantSlug,
    nonce: randomBytes(12).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(payloadBase64)
  return `${payloadBase64}.${signature}`
}

export function verifyConsentState(state: string): ConsentStatePayload | null {
  const [payloadBase64, signature] = state.split('.')
  if (!payloadBase64 || !signature) return null

  const expected = sign(payloadBase64)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length) return null
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as ConsentStatePayload
    if (!parsed?.tenantSlug || !parsed?.nonce || !parsed?.exp) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}
