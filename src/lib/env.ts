import { z } from "zod";

/**
 * Boolean parser that accepts the usual truthy strings (1/true/yes/on) and
 * everything else as false. Empty/undefined → false.
 */
const bool = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (!v) return false;
    return /^(1|true|yes|on)$/i.test(v.trim());
  });

/**
 * Integer parser that tolerates strings and rejects negative values. Empty
 * values fall through to the schema default.
 */
const intStr = (defaultValue: number) =>
  z
    .union([z.string(), z.number(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === "") return defaultValue;
      if (typeof v === "number") return v;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : defaultValue;
    })
    .pipe(z.number().int().nonnegative());

/**
 * Optional secret/string. We normalize empty strings to undefined so callers
 * can use truthiness checks (`if (!e.X_API_KEY)`) without surprises and so
 * Zod's URL/format validators don't fire on blanks.
 */
const optStr = z
  .union([z.string(), z.undefined()])
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v.trim()));

/** Optional URL: must be a valid absolute URL when provided. */
const optUrl = z
  .union([z.string(), z.undefined()])
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v.trim()))
  .refine(
    (v) => {
      if (v === undefined) return true;
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "must be an absolute URL" }
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),

  DATABASE_URL: optStr,
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MAX_INDICATORS_PER_BATCH: intStr(500),
  MAX_UPLOAD_SIZE_MB: intStr(5),

  QUEUE_ENABLED: bool.default(true),
  QUEUE_BATCH_THRESHOLD: intStr(25),
  QUEUE_JOB_ATTEMPTS: intStr(3),
  HTTP_TIMEOUT_MS: intStr(15_000),

  URLHAUS_AUTH_KEY: optStr,
  URLHAUS_ENABLED: bool.default(true),
  URLHAUS_RATE_LIMIT_PER_MINUTE: intStr(30),

  URLSCAN_API_KEY: optStr,
  URLSCAN_DEFAULT_VISIBILITY: z
    .enum(["public", "unlisted", "private"])
    .default("unlisted"),
  URLSCAN_ENABLED: bool.default(true),
  URLSCAN_RATE_LIMIT_PER_MINUTE: intStr(20),

  GOOGLE_SAFE_BROWSING_API_KEY: optStr,
  GOOGLE_SAFE_BROWSING_ENABLED: bool.default(true),

  GOOGLE_WEB_RISK_API_KEY: optStr,
  GOOGLE_WEB_RISK_ENABLED: bool.default(false),

  ABUSEIPDB_API_KEY: optStr,
  ABUSEIPDB_ENABLED: bool.default(true),
  ABUSEIPDB_RATE_LIMIT_PER_MINUTE: intStr(30),

  CROWDSEC_API_KEY: optStr,
  CROWDSEC_ENABLED: bool.default(true),
  CROWDSEC_RATE_LIMIT_PER_MINUTE: intStr(30),

  VIRUSTOTAL_API_KEY: optStr,
  VIRUSTOTAL_ENABLED: bool.default(false),
  VIRUSTOTAL_ALLOW_ACTIVE_URL_SCAN: bool.default(false),
  VIRUSTOTAL_RATE_LIMIT_PER_MINUTE: intStr(4),

  MISP_BASE_URL: optUrl,
  MISP_API_KEY: optStr,
  MISP_VERIFY_TLS: bool.default(true),
  MISP_ENABLED: bool.default(false),

  OPENCTI_BASE_URL: optUrl,
  OPENCTI_API_KEY: optStr,
  OPENCTI_ENABLED: bool.default(false),

  PHISHTANK_API_KEY: optStr,
  PHISHTANK_ENABLED: bool.default(false),
  PHISHTANK_PLAYWRIGHT_ENABLED: bool.default(false),
  PHISHTANK_USERNAME: optStr,
  PHISHTANK_PASSWORD: optStr,

  MICROSOFT_TENANT_ID: optStr,
  MICROSOFT_CLIENT_ID: optStr,
  MICROSOFT_CLIENT_SECRET: optStr,
  MICROSOFT_DEFENDER_TI_ENABLED: bool.default(false),

  PLAYWRIGHT_ENABLED: bool.default(false),
  PLAYWRIGHT_SCREENSHOT_DIR: z.string().default("./screenshots"),
  CUSTOM_WEB_FORM_ENABLED: bool.default(false),
  CUSTOM_WEB_FORM_CONFIG_JSON: optStr,
  CUSTOM_WEB_FORM_USERNAME: optStr,
  CUSTOM_WEB_FORM_PASSWORD: optStr,
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Parse environment once and cache. In production, hard-fail on validation
 * errors so misconfigured deployments surface immediately. In dev/test we
 * log loudly and fall back to defaults to keep the UI responsive.
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    cached = parsed.data;
    return cached;
  }

  const flat = parsed.error.flatten();
  const isProd = process.env.NODE_ENV === "production";

  // We intentionally don't import the logger here to avoid a circular
  // dependency on env() during startup; the schema layer must be lower than
  // the logger which itself reads LOG_LEVEL.
  const summary = JSON.stringify(flat);
  if (isProd) {
    throw new Error(`[env] invalid configuration: ${summary}`);
  }
  console.warn(`[env] validation issues (using safe defaults): ${summary}`);
  cached = envSchema.parse({});
  return cached;
}

/**
 * Reset the cached env. Test-only helper so suites can mutate process.env
 * between cases without leaking state.
 */
export function __resetEnvCacheForTests() {
  cached = null;
}
