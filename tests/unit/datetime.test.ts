import { describe, expect, test } from "bun:test";
import { formatTransactionTime } from "../../src/shared/datetime";

describe("formatTransactionTime", () => {
  test("formats a UTC timestamp as British-style date and time", () => {
    // 2026-05-15 10:30 UTC = 11:30 in London (BST, UTC+1)
    const result = formatTransactionTime("2026-05-15T10:30:00.000Z");
    expect(result).toBe("15 May 2026, 11:30");
  });

  test("handles winter time (no BST offset)", () => {
    // 2026-01-15 10:30 UTC = 10:30 in London (GMT, UTC+0)
    const result = formatTransactionTime("2026-01-15T10:30:00.000Z");
    expect(result).toBe("15 Jan 2026, 10:30");
  });

  test("passes through unparseable input", () => {
    expect(formatTransactionTime("not a date")).toBe("not a date");
  });
});
