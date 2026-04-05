import { describe, expect, test } from "bun:test"
import { loadConfig } from "../../src/config"

const fullEnv = {
  DATABASE_PATH: "./data/test.db",
  COOKIE_SECRET: "test-secret",
  BACKUP_API_KEY: "test-api-key",
  ALLOWED_EMAILS: "topher@example.com, sarah@example.com",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GOOGLE_REDIRECT_URI: "https://example.com/auth/callback",
}

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const original = { ...process.env }
  // Clear all config-related vars first
  for (const key of Object.keys(fullEnv)) {
    delete process.env[key]
  }
  delete process.env.DEV_MODE
  delete process.env.PORT
  delete process.env.DEFAULT_NOTE

  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    fn()
  } finally {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    Object.assign(process.env, original)
  }
}

describe("loadConfig", () => {
  test("parses complete environment", () => {
    withEnv(fullEnv, () => {
      const config = loadConfig()
      expect(config.databasePath).toBe("./data/test.db")
      expect(config.cookieSecret).toBe("test-secret")
      expect(config.backupApiKey).toBe("test-api-key")
      expect(config.allowedEmails).toEqual(
        new Set(["topher@example.com", "sarah@example.com"]),
      )
      expect(config.googleClientId).toBe("google-id")
      expect(config.googleClientSecret).toBe("google-secret")
      expect(config.googleRedirectUri).toBe(
        "https://example.com/auth/callback",
      )
      expect(config.port).toBe(3000)
      expect(config.defaultNote).toBe("weekly pocket money")
      expect(config.devMode).toBe(false)
    })
  })

  test("fails fast listing all missing required vars", () => {
    withEnv({}, () => {
      expect(() => loadConfig()).toThrow(
        /DATABASE_PATH.*COOKIE_SECRET.*BACKUP_API_KEY.*ALLOWED_EMAILS.*GOOGLE_CLIENT_ID.*GOOGLE_CLIENT_SECRET.*GOOGLE_REDIRECT_URI/,
      )
    })
  })

  test("DEV_MODE=true skips Google OAuth vars", () => {
    withEnv({ ...fullEnv, DEV_MODE: "true" }, () => {
      const config = loadConfig()
      expect(config.devMode).toBe(true)
      expect(config.googleClientId).toBe("")
    })
  })

  test("DEV_MODE=true does not require Google vars", () => {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, ...devEnv } = fullEnv
    withEnv({ ...devEnv, DEV_MODE: "true" }, () => {
      const config = loadConfig()
      expect(config.devMode).toBe(true)
    })
  })

  test("custom PORT is respected", () => {
    withEnv({ ...fullEnv, PORT: "8080" }, () => {
      const config = loadConfig()
      expect(config.port).toBe(8080)
    })
  })

  test("custom DEFAULT_NOTE is respected", () => {
    withEnv({ ...fullEnv, DEFAULT_NOTE: "custom note" }, () => {
      const config = loadConfig()
      expect(config.defaultNote).toBe("custom note")
    })
  })

  test("ALLOWED_EMAILS handles whitespace", () => {
    withEnv({ ...fullEnv, ALLOWED_EMAILS: " a@b.com , c@d.com " }, () => {
      const config = loadConfig()
      expect(config.allowedEmails).toEqual(new Set(["a@b.com", "c@d.com"]))
    })
  })

  test("config object is frozen", () => {
    withEnv(fullEnv, () => {
      const config = loadConfig()
      expect(Object.isFrozen(config)).toBe(true)
    })
  })
})
