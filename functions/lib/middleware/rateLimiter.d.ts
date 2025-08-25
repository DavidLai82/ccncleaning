import { Request, Response, NextFunction } from 'express';
interface RateLimitOptions {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}
export declare const createRateLimit: (options: RateLimitOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const strictRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const paymentRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const appointmentRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const adminRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const getRateLimitStats: () => {
    totalKeys: number;
    entries: {
        key: string;
        count: number;
        remaining: number;
        resetTime: string;
        successCount: number;
        failureCount: number;
    }[];
};
export declare const clearRateLimit: (key: string) => boolean;
export declare const clearAllRateLimits: () => void;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map