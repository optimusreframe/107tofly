/**
 * Minimal structured logger for server-side handlers.
 * Emits single-line JSON to stdout so downstream log tooling can parse.
 * Keep server-only — do not import from client code.
 */

type Level = "info" | "warn" | "error";

type Payload = Record<string, unknown>;

function emit(level: Level, event: string, data: Payload) {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...data,
    });
    // eslint-disable-next-line no-console
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
  } catch {
    // ignore serialization failures
  }
}

export const logger = {
  info: (event: string, data: Payload = {}) => emit("info", event, data),
  warn: (event: string, data: Payload = {}) => emit("warn", event, data),
  error: (event: string, data: Payload = {}) => emit("error", event, data),
};

/**
 * Wrap a server-function handler so uncaught errors are logged with context
 * and re-thrown so TanStack surfaces them normally to the client.
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now();
    try {
      const out = await fn(...args);
      logger.info("serverfn.ok", { name, ms: Date.now() - start });
      return out;
    } catch (err) {
      logger.error("serverfn.fail", {
        name,
        ms: Date.now() - start,
        message: (err as Error)?.message ?? String(err),
      });
      throw err;
    }
  }) as T;
}
