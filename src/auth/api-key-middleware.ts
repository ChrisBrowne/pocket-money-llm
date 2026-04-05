import { Elysia } from "elysia"
import { timingSafeEqual } from "node:crypto"

export function apiKeyMiddleware(expectedKey: string) {
  const expectedBuffer = Buffer.from(expectedKey)

  return new Elysia({ name: "api-key-middleware" })
    .onBeforeHandle({ as: "scoped" }, ({ request, set }) => {
      const authHeader = request.headers.get("authorization") ?? ""
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : ""

      if (!token) {
        set.status = 401
        return "Unauthorized"
      }

      const tokenBuffer = Buffer.from(token)

      // Timing-safe comparison: prevent key length leakage
      const isValid =
        tokenBuffer.length === expectedBuffer.length &&
        timingSafeEqual(tokenBuffer, expectedBuffer)

      if (!isValid) {
        set.status = 401
        return "Unauthorized"
      }
    })
}
