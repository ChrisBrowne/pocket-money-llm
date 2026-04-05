import { describe, expect, test } from "bun:test"
import { formatPence } from "../../src/shared/currency"

describe("formatPence", () => {
  // Values from the AmountsDisplayedAsPoundsAndPence scenario
  test("formats 50 pence as £0.50", () => {
    expect(formatPence(50)).toBe("£0.50")
  })

  test("formats 500 pence as £5.00", () => {
    expect(formatPence(500)).toBe("£5.00")
  })

  test("formats 1000 pence as £10.00", () => {
    expect(formatPence(1000)).toBe("£10.00")
  })

  test("formats 1525 pence as £15.25", () => {
    expect(formatPence(1525)).toBe("£15.25")
  })

  test("formats 2575 pence as £25.75", () => {
    expect(formatPence(2575)).toBe("£25.75")
  })

  test("formats negative 200 pence as -£2.00", () => {
    expect(formatPence(-200)).toBe("-£2.00")
  })

  test("formats zero as £0.00", () => {
    expect(formatPence(0)).toBe("£0.00")
  })

  test("formats 1 pence as £0.01", () => {
    expect(formatPence(1)).toBe("£0.01")
  })

  test("formats negative 300 pence as -£3.00", () => {
    expect(formatPence(-300)).toBe("-£3.00")
  })
})
