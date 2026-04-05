import { Elysia } from "elysia"
import { signSession, COOKIE_NAME, cookieOptions } from "./session"
import type { Config } from "../config"
import { logger } from "../logger"

export function googleOAuthRoutes(config: Config) {
  return new Elysia({ name: "google-oauth" })
    .get("/auth/google", ({ set }) => {
      const params = new URLSearchParams({
        client_id: config.googleClientId,
        redirect_uri: config.googleRedirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
      })
      set.status = 302
      set.headers["location"] = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
      return ""
    })
    .get("/auth/callback", async ({ query, cookie, set }) => {
      const code = query.code
      if (!code) {
        set.status = 400
        return "Missing authorization code"
      }

      // Exchange code for tokens
      let tokenData: { access_token?: string }
      try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: config.googleClientId,
            client_secret: config.googleClientSecret,
            redirect_uri: config.googleRedirectUri,
            grant_type: "authorization_code",
          }),
        })
        tokenData = await tokenResponse.json() as { access_token?: string }
      } catch (e) {
        logger.error({ err: e }, "Failed to exchange OAuth code for token")
        set.status = 500
        return "Authentication failed"
      }

      if (!tokenData.access_token) {
        logger.error({ tokenData }, "No access token in OAuth response")
        set.status = 500
        return "Authentication failed"
      }

      // Fetch user info
      let userInfo: { email?: string; name?: string }
      try {
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        userInfo = await userResponse.json() as { email?: string; name?: string }
      } catch (e) {
        logger.error({ err: e }, "Failed to fetch user info from Google")
        set.status = 500
        return "Authentication failed"
      }

      const email = userInfo.email ?? ""
      const name = userInfo.name ?? (email.split("@")[0] || email)

      // Check whitelist
      if (!config.allowedEmails.has(email)) {
        logger.warn({ email }, "Unauthorised login attempt")
        set.status = 403
        return "Access denied. Your email is not authorised to use this application."
      }

      // Set session cookie
      const session = { email, name }
      const signed = signSession(session, config.cookieSecret)
      const opts = cookieOptions(config.devMode)

      const sessionCookie = cookie[COOKIE_NAME]
      if (sessionCookie) {
        sessionCookie.set({
          value: signed,
          httpOnly: opts.httpOnly,
          sameSite: opts.sameSite,
          secure: opts.secure,
          path: opts.path,
        })
      }

      set.status = 302
      set.headers["location"] = "/"
      return ""
    })
}
