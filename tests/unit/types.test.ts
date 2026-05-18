import { describe, expect, test } from "bun:test";
import {
  parseChildName,
  parsePence,
  parseBirthday,
  type ChildName,
  type Pence,
  type Birthday,
} from "../../src/shared/types";
import { assertOk, assertErr } from "../../src/shared/result";

describe("parseChildName", () => {
  test("accepts a valid name", () => {
    expect(assertOk(parseChildName("Alice"))).toBe("Alice" as ChildName);
  });

  test("trims whitespace", () => {
    expect(assertOk(parseChildName("  Alice  "))).toBe("Alice" as ChildName);
  });

  test("rejects empty string", () => {
    const error = assertErr(parseChildName(""));
    expect(error.message).toBe("Name is required");
  });

  test("rejects whitespace-only string", () => {
    const error = assertErr(parseChildName("   "));
    expect(error.message).toBe("Name is required");
  });
});

describe("parsePence", () => {
  test("converts pounds string to pence", () => {
    expect(assertOk(parsePence("5.00"))).toBe(500 as Pence);
  });

  test("converts 0.50 to 50 pence", () => {
    expect(assertOk(parsePence("0.50"))).toBe(50 as Pence);
  });

  test("converts whole number string", () => {
    expect(assertOk(parsePence("10"))).toBe(1000 as Pence);
  });

  test("converts 2.50 to 250 pence", () => {
    expect(assertOk(parsePence("2.50"))).toBe(250 as Pence);
  });

  test("handles small amounts", () => {
    expect(assertOk(parsePence("0.01"))).toBe(1 as Pence);
  });

  test("rejects zero", () => {
    const error = assertErr(parsePence("0"));
    expect(error.message).toBe("Amount must be greater than zero");
  });

  test("rejects negative amount", () => {
    const error = assertErr(parsePence("-5.00"));
    expect(error.message).toBe("Amount must be greater than zero");
  });

  test("rejects non-numeric string", () => {
    const error = assertErr(parsePence("abc"));
    expect(error.message).toBe("Amount must be a number");
  });

  test("rejects empty string", () => {
    const error = assertErr(parsePence(""));
    expect(error.message).toBe("Amount must be greater than zero");
  });

  test("handles 0.00 as zero", () => {
    const error = assertErr(parsePence("0.00"));
    expect(error.message).toBe("Amount must be greater than zero");
  });
});

describe("parseBirthday", () => {
  test("accepts a valid ISO date", () => {
    expect(assertOk(parseBirthday("2015-04-12"))).toBe(
      "2015-04-12" as Birthday,
    );
  });

  test("trims surrounding whitespace", () => {
    expect(assertOk(parseBirthday("  2015-04-12  "))).toBe(
      "2015-04-12" as Birthday,
    );
  });

  test("rejects empty string", () => {
    const error = assertErr(parseBirthday(""));
    expect(error.message).toBe("Date of birth is required");
  });

  test("rejects whitespace-only string", () => {
    const error = assertErr(parseBirthday("   "));
    expect(error.message).toBe("Date of birth is required");
  });

  test("rejects non-string input", () => {
    const error = assertErr(parseBirthday(null));
    expect(error.message).toBe("Date of birth is required");
  });

  test("rejects unrecognised format", () => {
    const error = assertErr(parseBirthday("12/04/2015"));
    expect(error.message).toBe("Date of birth must be in YYYY-MM-DD format");
  });

  test("rejects impossible calendar dates (Feb 30)", () => {
    const error = assertErr(parseBirthday("2025-02-30"));
    expect(error.message).toBe("Date of birth is not a real date");
  });

  test("rejects future dates", () => {
    const future = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    const error = assertErr(parseBirthday(future));
    expect(error.message).toBe("Date of birth cannot be in the future");
  });

  test("rejects implausibly old dates", () => {
    const error = assertErr(parseBirthday("1800-01-01"));
    expect(error.message).toBe("Date of birth is implausibly long ago");
  });
});
