import { Request, Response, NextFunction } from 'express';
export declare const securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestSizeLimiter: (maxSize?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const ipWhitelist: (allowedIPs?: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateUserAgent: (req: Request, res: Response, next: NextFunction) => void;
export declare const allowedMethods: (methods: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const csrfProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const honeypotValidation: (fieldName?: string) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map