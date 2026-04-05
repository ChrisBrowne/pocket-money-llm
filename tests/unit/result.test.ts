import { describe, expect, test } from "bun:test"
import {
  ok,
  err,
  isOk,
  isErr,
  assertOk,
  assertErr,
  some,
  none,
  isSome,
  isNone,
} from "../../src/shared/result"

describe("Result", () => {
  test("ok creates an Ok result", () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    expect(result).toEqual({ ok: true, value: 42 })
  })

  test("err creates an Err result", () => {
    const error = new Error("boom")
    const result = err(error)
    expect(result.ok).toBe(false)
    expect(result).toEqual({ ok: false, error })
  })

  test("isOk narrows to Ok", () => {
    const result = ok("hello")
    if (isOk(result)) {
      expect(result.value).toBe("hello")
    } else {
      throw new Error("should be Ok")
    }
  })

  test("isOk returns false for Err", () => {
    const result = err(new Error("fail"))
    expect(isOk(result)).toBe(false)
  })

  test("isErr narrows to Err", () => {
    const error = new Error("oops")
    const result = err(error)
    if (isErr(result)) {
      expect(result.error).toBe(error)
    } else {
      throw new Error("should be Err")
    }
  })

  test("isErr returns false for Ok", () => {
    const result = ok(1)
    expect(isErr(result)).toBe(false)
  })

  test("assertOk returns value for Ok", () => {
    expect(assertOk(ok("yes"))).toBe("yes")
  })

  test("assertOk throws for Err", () => {
    expect(() => assertOk(err(new Error("nope")))).toThrow(
      "Expected Ok, got Err: nope",
    )
  })

  test("assertErr returns error for Err", () => {
    const error = new Error("bad")
    expect(assertErr(err(error))).toBe(error)
  })

  test("assertErr throws for Ok", () => {
    expect(() => assertErr(ok(1))).toThrow("Expected Err, got Ok")
  })
})

describe("Option", () => {
  test("some creates a Some option", () => {
    const option = some(42)
    expect(option.some).toBe(true)
    expect(option).toEqual({ some: true, value: 42 })
  })

  test("none creates a None option", () => {
    const option = none()
    expect(option.some).toBe(false)
    expect(option).toEqual({ some: false })
  })

  test("isSome narrows to Some", () => {
    const option = some("hello")
    if (isSome(option)) {
      expect(option.value).toBe("hello")
    } else {
      throw new Error("should be Some")
    }
  })

  test("isSome returns false for None", () => {
    expect(isSome(none())).toBe(false)
  })

  test("isNone narrows to None", () => {
    const option = none()
    expect(isNone(option)).toBe(true)
  })

  test("isNone returns false for Some", () => {
    expect(isNone(some(1))).toBe(false)
  })
})
