type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const minLevel = LEVEL_ORDER[resolveLevel()];
const useJson = process.env.NODE_ENV === "production" || process.env.LOG_JSON === "1";

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function serializeError(value: unknown): Record<string, unknown> | unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  return value;
}

function normalizeContext(
  ctx?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!ctx) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = v instanceof Error ? serializeError(v) : v;
  }
  return out;
}

function emit(
  level: Level,
  bindings: Record<string, unknown>,
  msg: string,
  ctx?: Record<string, unknown>
) {
  if (LEVEL_ORDER[level] < minLevel) return;
  const payload = {
    level,
    time: new Date().toISOString(),
    msg,
    ...bindings,
    ...(normalizeContext(ctx) ?? {}),
  };
  const write = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (useJson) {
    write(JSON.stringify(payload));
    return;
  }
  const moduleTag = bindings.module ? `[${String(bindings.module)}]` : "";
  const extras = ctx && Object.keys(ctx).length ? " " + JSON.stringify(normalizeContext(ctx)) : "";
  write(`${payload.time} ${level.toUpperCase()} ${moduleTag} ${msg}${extras}`);
}

function build(bindings: Record<string, unknown>): Logger {
  return {
    debug: (msg, ctx) => emit("debug", bindings, msg, ctx),
    info: (msg, ctx) => emit("info", bindings, msg, ctx),
    warn: (msg, ctx) => emit("warn", bindings, msg, ctx),
    error: (msg, ctx) => emit("error", bindings, msg, ctx),
    child: (extra) => build({ ...bindings, ...extra }),
  };
}

export const logger: Logger = build({});

export function moduleLogger(name: string): Logger {
  return logger.child({ module: name });
}
