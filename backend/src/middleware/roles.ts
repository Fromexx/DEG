import { Request, Response, NextFunction } from 'express';
import { Roles } from '../types/users.types';

export function requireRole(...roles: Roles[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        //req.userRole = 'moderator';
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}