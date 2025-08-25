import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import * as functions from 'firebase-functions';

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
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

// Request size limiter
export const requestSizeLimiter = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      functions.logger.warn('Request size exceeded limit', {
        contentLength,
        maxSize,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      
      throw createError('Request entity too large', 413);
    }
    
    next();
  };
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any): any => {
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
      const sanitized: any = {};
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

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const forwardedIPs = req.get('X-Forwarded-For')?.split(',').map(ip => ip.trim()) || [];
    const allIPs = [clientIP, ...forwardedIPs];
    
    // Check if any of the IPs are in the whitelist
    const isAllowed = allowedIPs.some(allowedIP => 
      allIPs.some(ip => ip === allowedIP || ip.startsWith(allowedIP))
    );
    
    if (!isAllowed && allowedIPs.length > 0) {
      functions.logger.warn('IP not whitelisted', {
        clientIP,
        forwardedIPs,
        allowedIPs,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      
      throw createError('Access denied from this IP address', 403);
    }
    
    next();
  };
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Add request ID to request for tracking
  (req as any).requestId = requestId;
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
  res.send = function(data) {
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

// User-Agent validation middleware
export const validateUserAgent = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    functions.logger.warn('Missing User-Agent header', {
      ip: req.ip,
      url: req.url
    });
    
    throw createError('User-Agent header is required', 400);
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
    
    throw createError('Access denied', 403);
  }
  
  next();
};

// Request method validation
export const allowedMethods = (methods: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!methods.includes(req.method)) {
      res.set('Allow', methods.join(', '));
      throw createError(`Method ${req.method} not allowed`, 405);
    }
    
    next();
  };
};

// CSRF protection for state-changing operations
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.get('X-CSRF-Token') || req.body._csrf;
  const sessionToken = (req as any).user?.csrf_token;
  
  if (!token || !sessionToken || token !== sessionToken) {
    functions.logger.warn('CSRF token mismatch', {
      hasToken: !!token,
      hasSessionToken: !!sessionToken,
      ip: req.ip,
      url: req.url,
      method: req.method
    });
    
    throw createError('Invalid or missing CSRF token', 403);
  }
  
  next();
};

// Honeypot field validation (anti-bot measure)
export const honeypotValidation = (fieldName: string = 'website') => {
  return (req: Request, res: Response, next: NextFunction): void => {
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