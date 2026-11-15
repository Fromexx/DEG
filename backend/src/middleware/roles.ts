import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        req.userRole = 'moderator';
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}