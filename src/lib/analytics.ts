import { UAParser } from 'ua-parser-js'
import { isbot } from 'isbot'

export interface ClickMeta {
  ip: string | null
  country: string | null
  city: string | null
  userAgent: string | null
  browser: string | null
  os: string | null
  deviceType: string | null
  isBot: boolean
  referrer: string | null
}

/**
 * Extract analytics metadata from a request. Geo data comes from Vercel's
 * injected headers (x-vercel-ip-country / x-vercel-ip-city); locally they are
 * absent and the fields stay null.
 */
export function extractClickMeta(request: Request): ClickMeta {
  const h = request.headers
  const ua = h.get('user-agent')

  let browser: string | null = null
  let os: string | null = null
  let deviceType: string | null = null
  if (ua) {
    const parsed = UAParser(ua)
    browser = parsed.browser.name ?? null
    os = parsed.os.name ?? null
    deviceType = parsed.device.type ?? 'desktop'
  }

  const refHeader = h.get('referer')
  let referrer: string | null = null
  if (refHeader) {
    try {
      referrer = new URL(refHeader).hostname.slice(0, 255)
    } catch {
      referrer = refHeader.slice(0, 255)
    }
  }

  return {
    ip: h.get(process.env.TRUSTED_IP_HEADER ?? 'x-real-ip')?.slice(0, 64) ?? null,
    country: h.get('x-vercel-ip-country')?.slice(0, 8) ?? null,
    city: h.get('x-vercel-ip-city')?.slice(0, 128) ?? null,
    userAgent: ua?.slice(0, 512) ?? null,
    browser: browser?.slice(0, 100) ?? null,
    os: os?.slice(0, 100) ?? null,
    deviceType: deviceType?.slice(0, 50) ?? null,
    isBot: isbot(ua),
    referrer,
  }
}
