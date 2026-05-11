import { z } from "zod";

const bool = z
  .union([z.string(), z.boolean()])
  .transform((v) => (typeof v === "boolean" ? v : /^(1|true|yes|on)$/i.test(v)));

const intStr = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseInt(v, 10)))
  .pipe(z.number().int().nonnegative());

const optStr = z.string().optional().default("");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default(""),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MAX_INDICATORS_PER_BATCH: intStr.default(500),
  MAX_UPLOAD_SIZE_MB: intStr.default(5),

  QUEUE_ENABLED: bool.default(true),
  QUEUE_BATCH_THRESHOLD: intStr.default(25),

  URLHAUS_AUTH_KEY: optStr,
  URLHAUS_ENABLED: bool.default(true),
  URLHAUS_RATE_LIMIT_PER_MINUTE: intStr.default(30),

  URLSCAN_API_KEY: optStr,
  URLSCAN_DEFAULT_VISIBILITY: z
    .enum(["public", "unlisted", "private"])
    .default("unlisted"),
  URLSCAN_ENABLED: bool.default(true),
  URLSCAN_RATE_LIMIT_PER_MINUTE: intStr.default(20),

  GOOGLE_SAFE_BROWSING_API_KEY: optStr,
  GOOGLE_SAFE_BROWSING_ENABLED: bool.default(true),

  GOOGLE_WEB_RISK_API_KEY: optStr,
  GOOGLE_WEB_RISK_ENABLED: bool.default(false),

  ABUSEIPDB_API_KEY: optStr,
  ABUSEIPDB_ENABLED: bool.default(true),
  ABUSEIPDB_RATE_LIMIT_PER_MINUTE: intStr.default(30),

  CROWDSEC_API_KEY: optStr,
  CROWDSEC_ENABLED: bool.default(true),
  CROWDSEC_RATE_LIMIT_PER_MINUTE: intStr.default(30),

  VIRUSTOTAL_API_KEY: optStr,
  VIRUSTOTAL_ENABLED: bool.default(false),
  VIRUSTOTAL_ALLOW_ACTIVE_URL_SCAN: bool.default(false),
  VIRUSTOTAL_RATE_LIMIT_PER_MINUTE: intStr.default(4),

  MISP_BASE_URL: optStr,
  MISP_API_KEY: optStr,
  MISP_VERIFY_TLS: bool.default(true),
  MISP_ENABLED: bool.default(false),

  OPENCTI_BASE_URL: optStr,
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

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Don't throw at import time in dev — log and use defaults so the UI still renders.
    console.warn("[env] validation issues:", parsed.error.flatten());
    cached = envSchema.parse({});
  } else {
    cached = parsed.data;
  }
  return cached;
}
