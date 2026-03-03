type HeaderSource =
  | Headers
  | {
      get?: (key: string) => string | null | undefined
      [key: string]: unknown
    }

function readHeader(headers: HeaderSource | undefined, key: string): string | null {
  if (!headers) return null

  if (typeof headers.get === 'function') {
    return headers.get(key) ?? null
  }

  const direct = (headers as Record<string, unknown>)[key]
  if (typeof direct === 'string') return direct
  return null
}

export function getClientIpFromHeaders(headers: HeaderSource | undefined): string | null {
  const forwardedFor = readHeader(headers, 'x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = readHeader(headers, 'x-real-ip')
  if (realIp?.trim()) return realIp.trim()

  const cfIp = readHeader(headers, 'cf-connecting-ip')
  if (cfIp?.trim()) return cfIp.trim()

  const trueClientIp = readHeader(headers, 'true-client-ip')
  if (trueClientIp?.trim()) return trueClientIp.trim()

  return null
}

export function maskIp(ip: string | null | undefined): string {
  if (!ip) return '-'

  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':')
    return `${parts.slice(0, 2).join(':')}::xxxx`
  }

  return ip
}
