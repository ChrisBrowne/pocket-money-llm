import { some, none, type Option } from "../shared/result"

export interface Session {
  readonly email: string
  readonly name: string
}

export const COOKIE_NAME = "pocket_money_session"

export function signSession(session: Session, secret: string): string {
  const json = JSON.stringify(session)
  const payload = Buffer.from(json).toString("base64url")
  const hmac = new Bun.CryptoHasher("sha256", secret)
    .update(payload)
    .digest("base64url")
  return `${payload}.${hmac}`
}

export function verifySession(cookie: string, secret: string): Option<Session> {
  if (!cookie) return none()

  const dotIndex = cookie.indexOf(".")
  if (dotIndex === -1) return none()

  const payload = cookie.slice(0, dotIndex)
  const signature = cookie.slice(dotIndex + 1)

  const expected = new Bun.CryptoHasher("sha256", secret)
    .update(payload)
    .digest("base64url")

  if (signature !== expected) return none()

  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8")
    const parsed = JSON.parse(json)
    if (typeof parsed.email !== "string" || typeof parsed.name !== "string") {
      return none()
    }
    return some({ email: parsed.email, name: parsed.name })
  } catch {
    return none()
  }
}

export interface CookieOptions {
  httpOnly: boolean
  sameSite: "lax"
  secure: boolean
  path: string
  maxAge?: number
}

export function cookieOptions(devMode: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: !devMode,
    path: "/",
  }
}

export function expiredCookieOptions(devMode: boolean): CookieOptions {
  return {
    ...cookieOptions(devMode),
    maxAge: 0,
  }
}
