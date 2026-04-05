import { describe, expect, test } from "bun:test"
import { parseChildName, parsePence } from "../../src/shared/types"
import { assertOk, assertErr } from "../../src/shared/result"

describe("parseChildName", () => {
  test("accepts a valid name", () => {
    expect(assertOk(parseChildName("Alice"))).toBe("Alice")
  })

  test("trims whitespace", () => {
    expect(assertOk(parseChildName("  Alice  "))).toBe("Alice")
  })

  test("rejects empty string", () => {
    const error = assertErr(parseChildName(""))
    expect(error.message).toBe("Name is required")
  })

  test("rejects whitespace-only string", () => {
    const error = assertErr(parseChildName("   "))
    expect(error.message).toBe("Name is required")
  })
})

describe("parsePence", () => {
  test("converts pounds string to pence", () => {
    expect(assertOk(parsePence("5.00"))).toBe(500)
  })

  test("converts 0.50 to 50 pence", () => {
    expect(assertOk(parsePence("0.50"))).toBe(50)
  })

  test("converts whole number string", () => {
    expect(assertOk(parsePence("10"))).toBe(1000)
  })

  test("converts 2.50 to 250 pence", () => {
    expect(assertOk(parsePence("2.50"))).toBe(250)
  })

  test("handles small amounts", () => {
    expect(assertOk(parsePence("0.01"))).toBe(1)
  })

  test("rejects zero", () => {
    const error = assertErr(parsePence("0"))
    expect(error.message).toBe("Amount must be greater than zero")
  })

  test("rejects negative amount", () => {
    const error = assertErr(parsePence("-5.00"))
    expect(error.message).toBe("Amount must be greater than zero")
  })

  test("rejects non-numeric string", () => {
    const error = assertErr(parsePence("abc"))
    expect(error.message).toBe("Amount must be a number")
  })

  test("rejects empty string", () => {
    const error = assertErr(parsePence(""))
    expect(error.message).toBe("Amount must be greater than zero")
  })

  test("handles 0.00 as zero", () => {
    const error = assertErr(parsePence("0.00"))
    expect(error.message).toBe("Amount must be greater than zero")
  })
})
