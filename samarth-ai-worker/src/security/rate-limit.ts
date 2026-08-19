// ============================================================
// Samarth AI — Rate Limiting
// In-memory rate limiting for V1 (no KV dependency).
// Counters reset on Worker cold start.
// ============================================================

import { CONFIG } from '../config';

interface RateBucket {
    count: number;
    resetAt: number;
}

const minuteBuckets = new Map<string, RateBucket>();
const hourBuckets = new Map<string, RateBucket>();
let globalDailyCount = 0;
let globalDailyResetAt = 0;

function getNextMidnightUTC(): number {
    const now = new Date();
    const tomorrow = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    );
    return tomorrow.getTime();
}

function getBucket(
    map: Map<string, RateBucket>,
    key: string,
    windowMs: number
): RateBucket {
    const now = Date.now();
    let bucket = map.get(key);
    if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        map.set(key, bucket);
    }
    return bucket;
}

export interface RateLimitResult {
    allowed: boolean;
    error?: string;
    retryAfterMs?: number;
}

/**
 * Check rate limits for a given IP.
 * Returns whether the request is allowed.
 */
export function checkRateLimit(ip: string): RateLimitResult {
    const now = Date.now();

    // Reset global daily counter if past midnight
    if (now >= globalDailyResetAt) {
        globalDailyCount = 0;
        globalDailyResetAt = getNextMidnightUTC();
    }

    // Global daily cap (hard stop — never auto-upgrade to paid)
    if (globalDailyCount >= CONFIG.MAX_GLOBAL_AI_REQUESTS_PER_DAY) {
        return {
            allowed: false,
            error:
                'Samarth AI has reached its daily limit. Please try again tomorrow or explore the portfolio directly.',
            retryAfterMs: globalDailyResetAt - now,
        };
    }

    // Per-IP per-minute
    const minuteBucket = getBucket(minuteBuckets, ip, 60_000);
    if (minuteBucket.count >= CONFIG.MAX_REQUESTS_PER_IP_PER_MINUTE) {
        return {
            allowed: false,
            error: 'Too many requests. Please wait a moment before asking again.',
            retryAfterMs: minuteBucket.resetAt - now,
        };
    }

    // Per-IP per-hour
    const hourBucket = getBucket(hourBuckets, ip, 3_600_000);
    if (hourBucket.count >= CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
        return {
            allowed: false,
            error:
                'You\'ve asked many questions this hour. Please try again later or explore the portfolio directly.',
            retryAfterMs: hourBucket.resetAt - now,
        };
    }

    // All passed — increment counters
    minuteBucket.count++;
    hourBucket.count++;
    globalDailyCount++;

    // Occasional cleanup of stale data (approx 1% of requests)
    if (Math.random() < 0.01) {
        for (const [key, b] of minuteBuckets) {
            if (now >= b.resetAt) minuteBuckets.delete(key);
        }
        for (const [key, b] of hourBuckets) {
            if (now >= b.resetAt) hourBuckets.delete(key);
        }
    }

    return { allowed: true };
}
