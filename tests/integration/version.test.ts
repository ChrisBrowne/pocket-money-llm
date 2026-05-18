import { describe, expect, test } from "bun:test";
import { VERSION } from "../../src/version";

describe("VERSION", () => {
  test("is a non-empty string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
  });

  test("is either a 7-char hex SHA, the env-var override, or 'unknown'", () => {
    const shaShape = /^[0-9a-f]{7}$/;
    const isSha = shaShape.test(VERSION);
    const isEnvOverride = process.env.VERSION === VERSION;
    const isUnknown = VERSION === "unknown";
    expect(isSha || isEnvOverride || isUnknown).toBe(true);
  });
});
