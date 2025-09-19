import { NextRequest } from "next/server";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitData {
  count: number;
  resetTime: number;
}

// Simple in-memory store for rate limiting
// In production, you'd want to use Redis or a proper cache
const store = new Map<string, RateLimitData>();

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private keyGenerator: (request: NextRequest) => string;

  constructor(options: RateLimitOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
  }

  private defaultKeyGenerator(request: NextRequest): string {
    // Default: use IP address and user ID if available
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userId = request.headers.get("x-user-id") || "";
    return `${ip}:${userId}`;
  }

  async check(request: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    total: number;
  }> {
    const key = this.keyGenerator(request);
    const now = Date.now();

    // Clean up expired entries periodically
    this.cleanup();

    let data = store.get(key);

    if (!data || now > data.resetTime) {
      // Create new or reset expired entry
      data = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      store.set(key, data);

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: data.resetTime,
        total: this.maxRequests,
      };
    }

    // Check if limit exceeded
    if (data.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime,
        total: this.maxRequests,
      };
    }

    // Increment count
    data.count++;
    store.set(key, data);

    return {
      allowed: true,
      remaining: this.maxRequests - data.count,
      resetTime: data.resetTime,
      total: this.maxRequests,
    };
  }

  private cleanup(): void {
    const now = Date.now();

    // Remove expired entries (simple cleanup)
    for (const [key, data] of store.entries()) {
      if (now > data.resetTime) {
        store.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters
export const createRateLimiter = RateLimiter;

// Rate limiter for API endpoints
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
});

// Rate limiter for buyer creation/updates
export const buyerMutationRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 mutations
  windowMs: 60 * 1000, // per minute
});

// Rate limiter for CSV imports
export const csvImportRateLimiter = new RateLimiter({
  maxRequests: 3, // 3 imports
  windowMs: 60 * 1000, // per minute
});

// Rate limiter for authentication attempts
export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  keyGenerator: (request) => {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    return `auth:${ip}`;
  },
});

// Utility function to check rate limit and return response if exceeded
export async function checkRateLimit(
  request: NextRequest,
  rateLimiter: RateLimiter
): Promise<Response | null> {
  const result = await rateLimiter.check(request);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);

    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again after ${resetDate.toISOString()}`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.total.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetTime.toString(),
          "Retry-After": Math.ceil(
            (result.resetTime - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  return null; // No rate limit exceeded
}
