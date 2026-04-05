import { describe, expect, test } from "bun:test"
import {
  signSession,
  verifySession,
  cookieOptions,
  expiredCookieOptions,
  type Session,
} from "../../src/auth/session"
import { isSome, isNone } from "../../src/shared/result"

const secret = "test-secret-key"
const session: Session = { email: "topher@example.com", name: "Topher" }

describe("signSession / verifySession", () => {
  test("round-trip produces the original session", () => {
    const cookie = signSession(session, secret)
    const result = verifySession(cookie, secret)
    expect(isSome(result)).toBe(true)
    if (isSome(result)) {
      expect(result.value).toEqual(session)
    }
  })

  test("tampered payload returns none", () => {
    const cookie = signSession(session, secret)
    const tampered = "x" + cookie.slice(1)
    expect(isNone(verifySession(tampered, secret))).toBe(true)
  })

  test("tampered signature returns none", () => {
    const cookie = signSession(session, secret)
    const tampered = cookie.slice(0, -1) + "x"
    expect(isNone(verifySession(tampered, secret))).toBe(true)
  })

  test("wrong secret returns none", () => {
    const cookie = signSession(session, secret)
    expect(isNone(verifySession(cookie, "wrong-secret"))).toBe(true)
  })

  test("empty string returns none", () => {
    expect(isNone(verifySession("", secret))).toBe(true)
  })

  test("no dot separator returns none", () => {
    expect(isNone(verifySession("nodothere", secret))).toBe(true)
  })

  test("invalid base64 payload returns none", () => {
    expect(isNone(verifySession("!!!.???", secret))).toBe(true)
  })
})

describe("cookieOptions", () => {
  test("production sets secure=true", () => {
    const opts = cookieOptions(false)
    expect(opts.httpOnly).toBe(true)
    expect(opts.sameSite).toBe("lax")
    expect(opts.secure).toBe(true)
    expect(opts.path).toBe("/")
  })

  test("dev mode sets secure=false", () => {
    const opts = cookieOptions(true)
    expect(opts.secure).toBe(false)
  })

  test("expired cookie has maxAge=0", () => {
    const opts = expiredCookieOptions(false)
    expect(opts.maxAge).toBe(0)
    expect(opts.httpOnly).toBe(true)
  })
})
