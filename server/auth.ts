import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";

let jwtSecret: string;
if (process.env.JWT_SECRET) {
  jwtSecret = process.env.JWT_SECRET;
} else {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] WARNING: JWT_SECRET env var not set in production. " +
      "Tokens will be invalidated on every server restart. " +
      "Set JWT_SECRET to a stable secret."
    );
  }
  jwtSecret = randomBytes(32).toString("hex");
}

const HEADER_B64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
const TOKEN_TTL_SECS = 30 * 24 * 3600;

export function signToken(customerId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: customerId, iat: now, exp: now + TOKEN_TTL_SECS })
  ).toString("base64url");
  const sig = createHmac("sha256", jwtSecret)
    .update(`${HEADER_B64}.${payload}`)
    .digest("base64url");
  return `${HEADER_B64}.${payload}.${sig}`;
}

export function verifyToken(token: string): { customerId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  try {
    const expBuf = Buffer.from(expected, "base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    if (expBuf.length !== sigBuf.length || !timingSafeEqual(expBuf, sigBuf)) {
      return null;
    }
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!claims.sub || typeof claims.sub !== "string") return null;
    if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { customerId: claims.sub };
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "خدمة الإدارة غير متاحة" });
    return;
  }
  const provided = req.headers["x-admin-api-key"];
  if (typeof provided !== "string" || provided.length !== adminKey.length) {
    res.status(403).json({ error: "غير مسموح" });
    return;
  }
  try {
    if (!timingSafeEqual(Buffer.from(provided, "utf-8"), Buffer.from(adminKey, "utf-8"))) {
      res.status(403).json({ error: "غير مسموح" });
      return;
    }
  } catch {
    res.status(403).json({ error: "غير مسموح" });
    return;
  }
  next();
}

export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const token = authHeader.slice(7);
  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({ error: "الجلسة منتهية، يرجى تسجيل الدخول مجدداً" });
    return;
  }
  res.locals.customerId = claims.customerId;
  next();
}

/**
 * Optional customer auth: if a valid Bearer token is present, attaches
 * res.locals.customerId; otherwise continues anonymously without rejecting.
 * Used for public AI endpoints (damage assessment) that must work without login
 * while still binding the request to a customer when one is signed in.
 */
export function optionalCustomer(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const claims = verifyToken(authHeader.slice(7));
    if (claims) {
      res.locals.customerId = claims.customerId;
    }
  }
  next();
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

interface RateLimitBucket {
  timestamps: number[];
}

export class RateLimiter {
  private store = new Map<string, RateLimitBucket>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /** Returns true if the request is allowed, false if over limit. */
  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const bucket = this.store.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length >= this.maxRequests) {
      this.store.set(key, bucket);
      return false;
    }
    bucket.timestamps.push(now);
    this.store.set(key, bucket);
    return true;
  }

  /** Seconds until the caller can retry. */
  retryAfterSeconds(key: string): number {
    const bucket = this.store.get(key);
    if (!bucket || bucket.timestamps.length === 0) return 0;
    const oldest = Math.min(...bucket.timestamps);
    return Math.max(0, Math.ceil((oldest + this.windowMs - Date.now()) / 1000));
  }
}

/**
 * Per-IP OTP send limiter: 5 OTP sends per IP per 15 minutes.
 * Prevents using the service as an SMS spam cannon against arbitrary numbers.
 */
export const otpIpLimiter = new RateLimiter(15 * 60 * 1000, 5);

/**
 * Per-customer AI endpoint limiter: 20 requests per hour per customer.
 * Prevents a single low-cost account from generating unbounded paid GPT-4o calls.
 */
export const aiCustomerLimiter = new RateLimiter(60 * 60 * 1000, 20);

/**
 * Per-IP AI endpoint limiter: 40 requests per hour per IP.
 * Secondary defence against multi-account abuse from the same origin.
 */
export const aiIpLimiter = new RateLimiter(60 * 60 * 1000, 40);

/**
 * Per-IP email send limiter: 5 requests per minute per IP.
 * Prevents email abuse from the analysis PDF send endpoint.
 */
export const emailIpLimiter = new RateLimiter(60 * 1000, 5);

// ─── OTP Store ──────────────────────────────────────────────────────────────

interface OtpEntry {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const otpStore = new Map<string, OtpEntry>();

function hashOtp(code: string): string {
  return createHmac("sha256", jwtSecret).update(code).digest("hex");
}

export interface OtpIssueResult {
  code: string;
  cooldownRemaining?: number;
}

export function issueOtp(mobileE164: string): OtpIssueResult | { cooldownRemaining: number } {
  const existing = otpStore.get(mobileE164);
  const now = Date.now();
  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    return { cooldownRemaining: Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000) };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(mobileE164, {
    hash: hashOtp(code),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });
  return { code };
}

/**
 * Returns true when an active (non-expired) OTP entry exists for this number.
 * Used by the login/resend route to allow OTP resends while a registration is
 * still in flight (i.e. the account does not yet exist in the DB).
 */
export function hasPendingOtp(mobileE164: string): boolean {
  const entry = otpStore.get(mobileE164);
  return !!entry && Date.now() <= entry.expiresAt;
}

export type OtpVerifyResult =
  | { success: true }
  | { success: false; error: string; attemptsLeft?: number };

export function verifyOtp(mobileE164: string, code: string): OtpVerifyResult {
  const entry = otpStore.get(mobileE164);
  if (!entry) {
    return { success: false, error: "لم يتم إرسال رمز التحقق، يرجى طلب رمز جديد" };
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(mobileE164);
    return { success: false, error: "انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد" };
  }
  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(mobileE164);
    return { success: false, error: "تجاوزت الحد المسموح من المحاولات، يرجى طلب رمز جديد" };
  }
  const expected = hashOtp(code.trim());
  const expBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(entry.hash, "hex");
  if (expBuf.length !== gotBuf.length || !timingSafeEqual(expBuf, gotBuf)) {
    entry.attempts += 1;
    const attemptsLeft = OTP_MAX_ATTEMPTS - entry.attempts;
    if (attemptsLeft <= 0) {
      otpStore.delete(mobileE164);
      return { success: false, error: "رمز التحقق غير صحيح. تم تجاوز الحد المسموح من المحاولات" };
    }
    return { success: false, error: "رمز التحقق غير صحيح", attemptsLeft };
  }
  otpStore.delete(mobileE164);
  return { success: true };
}
