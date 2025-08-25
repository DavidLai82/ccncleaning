import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import * as functions from 'firebase-functions';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  successCount?: number;
  failureCount?: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup function to remove expired entries
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupExpiredEntries();
    }
    
    let record = rateLimitStore.get(key);
    
    // Initialize or reset record if expired
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
        successCount: 0,
        failureCount: 0
      };
      rateLimitStore.set(key, record);
    }
    
    // Check if limit exceeded
    if (record.count >= max) {
      functions.logger.warn('Rate limit exceeded', {
        key,
        count: record.count,
        limit: max,
        resetTime: new Date(record.resetTime).toISOString(),
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
      });
      
      throw createError(message, 429);
    }
    
    // Increment counter
    record.count++;
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });
    
    // Track request outcome for analytics
    const originalSend = res.send;
    res.send = function(data) {
      const statusCode = res.statusCode;
      
      if (!skipSuccessfulRequests && statusCode < 400) {
        record!.successCount = (record!.successCount || 0) + 1;
      }
      
      if (!skipFailedRequests && statusCode >= 400) {
        record!.failureCount = (record!.failureCount || 0) + 1;
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Pre-configured rate limiters for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again in 15 minutes.',
  keyGenerator: (req) => {
    // Rate limit by email if provided, otherwise by IP
    const email = req.body?.email;
    return email ? `auth:${email}` : `auth:${req.ip}`;
  }
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many API requests, please try again later.',
  keyGenerator: (req) => `api:${req.ip}`
});

export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Rate limit exceeded for sensitive operations.',
  keyGenerator: (req) => `strict:${req.ip}`
});

export const paymentRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 payment attempts per 5 minutes
  message: 'Too many payment attempts, please wait before trying again.',
  keyGenerator: (req) => {
    // Rate limit payment attempts by user if authenticated
    const userId = (req as any).user?.uid;
    return userId ? `payment:${userId}` : `payment:${req.ip}`;
  }
});

export const appointmentRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 appointment requests per hour
  message: 'Too many appointment requests, please try again later.',
  keyGenerator: (req) => {
    const userId = (req as any).user?.uid;
    return userId ? `appointment:${userId}` : `appointment:${req.ip}`;
  }
});

// Admin operations rate limit
export const adminRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin operations per 5 minutes
  message: 'Too many admin operations, please slow down.',
  keyGenerator: (req) => {
    const userId = (req as any).user?.uid;
    return `admin:${userId || req.ip}`;
  }
});

// Get rate limit statistics (for monitoring)
export const getRateLimitStats = () => {
  const stats = {
    totalKeys: rateLimitStore.size,
    entries: [] as Array<{
      key: string;
      count: number;
      remaining: number;
      resetTime: string;
      successCount: number;
      failureCount: number;
    }>
  };
  
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now <= record.resetTime) { // Only include active entries
      stats.entries.push({
        key,
        count: record.count,
        remaining: Math.max(0, 100 - record.count), // Assuming default max of 100
        resetTime: new Date(record.resetTime).toISOString(),
        successCount: record.successCount || 0,
        failureCount: record.failureCount || 0
      });
    }
  }
  
  return stats;
};

// Clear rate limit for a specific key (admin function)
export const clearRateLimit = (key: string): boolean => {
  return rateLimitStore.delete(key);
};

// Clear all rate limits (admin function)
export const clearAllRateLimits = (): void => {
  rateLimitStore.clear();
  functions.logger.info('All rate limits cleared');
};