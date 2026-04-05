export interface Config {
  readonly allowedEmails: Set<string>
  readonly databasePath: string
  readonly cookieSecret: string
  readonly backupApiKey: string
  readonly googleClientId: string
  readonly googleClientSecret: string
  readonly googleRedirectUri: string
  readonly port: number
  readonly defaultNote: string
  readonly devMode: boolean
}

export function loadConfig(): Config {
  const devMode = process.env.DEV_MODE === "true"

  const missing: string[] = []
  function required(name: string): string {
    const value = process.env[name]
    if (!value) {
      missing.push(name)
      return ""
    }
    return value
  }

  const databasePath = required("DATABASE_PATH")
  const cookieSecret = required("COOKIE_SECRET")
  const backupApiKey = required("BACKUP_API_KEY")
  const allowedEmailsRaw = required("ALLOWED_EMAILS")

  // Google OAuth vars only required when not in dev mode
  let googleClientId = ""
  let googleClientSecret = ""
  let googleRedirectUri = ""
  if (!devMode) {
    googleClientId = required("GOOGLE_CLIENT_ID")
    googleClientSecret = required("GOOGLE_CLIENT_SECRET")
    googleRedirectUri = required("GOOGLE_REDIRECT_URI")
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    )
  }

  const allowedEmails = new Set(
    allowedEmailsRaw
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e !== ""),
  )

  const port = Number(process.env.PORT) || 3000
  const defaultNote = process.env.DEFAULT_NOTE || "weekly pocket money"

  return Object.freeze({
    allowedEmails,
    databasePath,
    cookieSecret,
    backupApiKey,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    port,
    defaultNote,
    devMode,
  })
}
