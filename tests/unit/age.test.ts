import { describe, expect, test } from "bun:test";
import { computeAge, formatAgeWords } from "../../src/shared/age";

describe("computeAge", () => {
  test("returns full years for a clean rollover case", () => {
    expect(computeAge("2015-04-12", new Date("2025-08-01T12:00:00Z"))).toBe(10);
  });

  test("returns 0 on the day of birth itself", () => {
    expect(computeAge("2025-08-01", new Date("2025-08-01T12:00:00Z"))).toBe(0);
  });

  test("does not round up the day before birthday", () => {
    // Born May 1st 2015; on April 30th 2025 they're still 9.
    expect(computeAge("2015-05-01", new Date("2025-04-30T23:59:59Z"))).toBe(9);
  });

  test("rolls over on the birthday", () => {
    expect(computeAge("2015-05-01", new Date("2025-05-01T00:00:01Z"))).toBe(10);
  });

  test("handles leap-day births before the birthday in a non-leap year", () => {
    // Born Feb 29 2016. On Feb 28 2025 they haven't hit Feb 29 yet → 8.
    expect(computeAge("2016-02-29", new Date("2025-02-28T12:00:00Z"))).toBe(8);
  });

  test("handles leap-day births on Mar 1 of a non-leap year", () => {
    // After Feb 29 has passed for the year, the rollover has happened → 9.
    expect(computeAge("2016-02-29", new Date("2025-03-01T12:00:00Z"))).toBe(9);
  });

  test("month-before-birthday rolls down", () => {
    expect(computeAge("2015-06-15", new Date("2025-03-15T12:00:00Z"))).toBe(9);
  });

  test("month-after-birthday rolls up", () => {
    expect(computeAge("2015-06-15", new Date("2025-08-15T12:00:00Z"))).toBe(10);
  });
});

describe("formatAgeWords", () => {
  test("singular at exactly 1", () => {
    expect(formatAgeWords(1)).toBe("1 year old");
  });

  test("plural at 0", () => {
    expect(formatAgeWords(0)).toBe("0 years old");
  });

  test("plural at 10", () => {
    expect(formatAgeWords(10)).toBe("10 years old");
  });
});
