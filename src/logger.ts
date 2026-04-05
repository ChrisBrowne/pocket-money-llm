import pino from "pino"

const transport =
  process.env.DEV_MODE === "true"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined

export const logger = pino({ transport })
