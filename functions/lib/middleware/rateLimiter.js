"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllRateLimits = exports.clearRateLimit = exports.getRateLimitStats = exports.adminRateLimit = exports.appointmentRateLimit = exports.paymentRateLimit = exports.strictRateLimit = exports.apiRateLimit = exports.authRateLimit = exports.createRateLimit = void 0;
const errorHandler_1 = require("./errorHandler");
const functions = __importStar(require("firebase-functions"));
// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();
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
const createRateLimit = (options) => {
    const { windowMs, max, message = 'Too many requests, please try again later.', keyGenerator = (req) => req.ip || 'unknown', skipSuccessfulRequests = false, skipFailedRequests = false } = options;
    return (req, res, next) => {
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
            throw (0, errorHandler_1.createError)(message, 429);
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
        res.send = function (data) {
            const statusCode = res.statusCode;
            if (!skipSuccessfulRequests && statusCode < 400) {
                record.successCount = (record.successCount || 0) + 1;
            }
            if (!skipFailedRequests && statusCode >= 400) {
                record.failureCount = (record.failureCount || 0) + 1;
            }
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.createRateLimit = createRateLimit;
// Pre-configured rate limiters for different endpoints
exports.authRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
    keyGenerator: (req) => {
        var _a;
        // Rate limit by email if provided, otherwise by IP
        const email = (_a = req.body) === null || _a === void 0 ? void 0 : _a.email;
        return email ? `auth:${email}` : `auth:${req.ip}`;
    }
});
exports.apiRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many API requests, please try again later.',
    keyGenerator: (req) => `api:${req.ip}`
});
exports.strictRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Rate limit exceeded for sensitive operations.',
    keyGenerator: (req) => `strict:${req.ip}`
});
exports.paymentRateLimit = (0, exports.createRateLimit)({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: 'Too many payment attempts, please wait before trying again.',
    keyGenerator: (req) => {
        var _a;
        // Rate limit payment attempts by user if authenticated
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        return userId ? `payment:${userId}` : `payment:${req.ip}`;
    }
});
exports.appointmentRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many appointment requests, please try again later.',
    keyGenerator: (req) => {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        return userId ? `appointment:${userId}` : `appointment:${req.ip}`;
    }
});
// Admin operations rate limit
exports.adminRateLimit = (0, exports.createRateLimit)({
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'Too many admin operations, please slow down.',
    keyGenerator: (req) => {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
        return `admin:${userId || req.ip}`;
    }
});
// Get rate limit statistics (for monitoring)
const getRateLimitStats = () => {
    const stats = {
        totalKeys: rateLimitStore.size,
        entries: []
    };
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now <= record.resetTime) { // Only include active entries
            stats.entries.push({
                key,
                count: record.count,
                remaining: Math.max(0, 100 - record.count),
                resetTime: new Date(record.resetTime).toISOString(),
                successCount: record.successCount || 0,
                failureCount: record.failureCount || 0
            });
        }
    }
    return stats;
};
exports.getRateLimitStats = getRateLimitStats;
// Clear rate limit for a specific key (admin function)
const clearRateLimit = (key) => {
    return rateLimitStore.delete(key);
};
exports.clearRateLimit = clearRateLimit;
// Clear all rate limits (admin function)
const clearAllRateLimits = () => {
    rateLimitStore.clear();
    functions.logger.info('All rate limits cleared');
};
exports.clearAllRateLimits = clearAllRateLimits;
//# sourceMappingURL=rateLimiter.js.map