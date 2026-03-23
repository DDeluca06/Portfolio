import pino from "pino";

export const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "development" ? "debug" : "info"),
  name: "resufolio",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
  redact: {
    paths: ["req.headers.authorization", "password", "token"],
    censor: "[REDACTED]",
  },
});

export const dbLogger = logger.child({ component: "database" });
export const apiLogger = logger.child({ component: "api" });
export const dockerLogger = logger.child({ component: "docker" });
