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
exports.honeypotValidation = exports.csrfProtection = exports.allowedMethods = exports.validateUserAgent = exports.requestLogger = exports.ipWhitelist = exports.sanitizeInput = exports.requestSizeLimiter = exports.securityHeaders = void 0;
const errorHandler_1 = require("./errorHandler");
const functions = __importStar(require("firebase-functions"));
// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    // Set security headers
    res.set({
        // Prevent XSS attacks
        'X-XSS-Protection': '1; mode=block',
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        // Force HTTPS
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Content Security Policy
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' https:",
            "connect-src 'self' https://api.stripe.com https://*.supabase.co",
            "frame-src https://js.stripe.com"
        ].join('; '),
        // Permissions policy
        'Permissions-Policy': [
            'geolocation=()',
            'microphone=()',
            'camera=()',
            'payment=(self)'
        ].join(', ')
    });
    next();
};
exports.securityHeaders = securityHeaders;
// Request size limiter
const requestSizeLimiter = (maxSize = 1024 * 1024) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length') || '0', 10);
        if (contentLength > maxSize) {
            functions.logger.warn('Request size exceeded limit', {
                contentLength,
                maxSize,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url
            });
            throw (0, errorHandler_1.createError)('Request entity too large', 413);
        }
        next();
    };
};
exports.requestSizeLimiter = requestSizeLimiter;
// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remove potentially dangerous characters
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
                .replace(/javascript:/gi, '') // Remove javascript: protocols
                .replace(/on\w+\s*=/gi, '') // Remove event handlers
                .trim();
        }
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        if (value && typeof value === 'object') {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    };
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
// IP whitelist middleware (for admin endpoints)
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        var _a;
        // Skip in development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const forwardedIPs = ((_a = req.get('X-Forwarded-For')) === null || _a === void 0 ? void 0 : _a.split(',').map(ip => ip.trim())) || [];
        const allIPs = [clientIP, ...forwardedIPs];
        // Check if any of the IPs are in the whitelist
        const isAllowed = allowedIPs.some(allowedIP => allIPs.some(ip => ip === allowedIP || ip.startsWith(allowedIP)));
        if (!isAllowed && allowedIPs.length > 0) {
            functions.logger.warn('IP not whitelisted', {
                clientIP,
                forwardedIPs,
                allowedIPs,
                userAgent: req.get('User-Agent'),
                url: req.url
            });
            throw (0, errorHandler_1.createError)('Access denied from this IP address', 403);
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    // Add request ID to request for tracking
    req.requestId = requestId;
    res.set('X-Request-ID', requestId);
    // Log request start
    functions.logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
    });
    // Override res.send to log response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        functions.logger.info('Request completed', {
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            responseSize: data ? Buffer.byteLength(data.toString()) : 0
        });
        return originalSend.call(this, data);
    };
    next();
};
exports.requestLogger = requestLogger;
// User-Agent validation middleware
const validateUserAgent = (req, res, next) => {
    const userAgent = req.get('User-Agent');
    if (!userAgent) {
        functions.logger.warn('Missing User-Agent header', {
            ip: req.ip,
            url: req.url
        });
        throw (0, errorHandler_1.createError)('User-Agent header is required', 400);
    }
    // Block known bad user agents
    const blockedAgents = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i
    ];
    const isBlocked = blockedAgents.some(pattern => pattern.test(userAgent));
    if (isBlocked) {
        functions.logger.warn('Blocked user agent detected', {
            userAgent,
            ip: req.ip,
            url: req.url
        });
        throw (0, errorHandler_1.createError)('Access denied', 403);
    }
    next();
};
exports.validateUserAgent = validateUserAgent;
// Request method validation
const allowedMethods = (methods) => {
    return (req, res, next) => {
        if (!methods.includes(req.method)) {
            res.set('Allow', methods.join(', '));
            throw (0, errorHandler_1.createError)(`Method ${req.method} not allowed`, 405);
        }
        next();
    };
};
exports.allowedMethods = allowedMethods;
// CSRF protection for state-changing operations
const csrfProtection = (req, res, next) => {
    var _a;
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    const token = req.get('X-CSRF-Token') || req.body._csrf;
    const sessionToken = (_a = req.user) === null || _a === void 0 ? void 0 : _a.csrf_token;
    if (!token || !sessionToken || token !== sessionToken) {
        functions.logger.warn('CSRF token mismatch', {
            hasToken: !!token,
            hasSessionToken: !!sessionToken,
            ip: req.ip,
            url: req.url,
            method: req.method
        });
        throw (0, errorHandler_1.createError)('Invalid or missing CSRF token', 403);
    }
    next();
};
exports.csrfProtection = csrfProtection;
// Honeypot field validation (anti-bot measure)
const honeypotValidation = (fieldName = 'website') => {
    return (req, res, next) => {
        if (req.body && req.body[fieldName]) {
            functions.logger.warn('Honeypot field filled, likely bot', {
                fieldName,
                value: req.body[fieldName],
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url
            });
            // Return success to avoid revealing the honeypot
            res.json({ status: 'success', message: 'Form submitted successfully' });
            return;
        }
        next();
    };
};
exports.honeypotValidation = honeypotValidation;
//# sourceMappingURL=security.js.map