import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
export interface AuthRequest extends Request {
    user?: admin.auth.DecodedIdToken & {
        uid: string;
        role?: string;
    };
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const setUserRole: (uid: string, role: 'client' | 'admin' | 'provider') => Promise<void>;
export declare const getUserFromFirestore: (uid: string) => Promise<{
    id: string;
}>;
//# sourceMappingURL=auth.d.ts.map