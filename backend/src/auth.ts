import { validate, parse, type InitData } from '@tma.js/init-data-node';
import {
    type ErrorRequestHandler,
    type RequestHandler,
    type Response,
} from 'express';

const BOT_TOKEN = process.env.BOT_TOKEN!;

function setInitData(res: Response, initData: InitData): void {
    res.locals.initData = initData;
}

export function getInitData(res: Response): InitData | undefined {
    return res.locals.initData;
}

export const authMiddleware: RequestHandler = (req, res, next) => {
    const [authType, authData = ''] = (req.header('authorization') || '').split(' ');

    switch (authType) {
        case 'tma':
        try {
            validate(authData, BOT_TOKEN, {
            expiresIn: 3600,
            });

            setInitData(res, parse(authData));
            return next();
        } catch (e) {
            return next(e);
        }
        default:
        return next(new Error('Unauthorized'));
    }
};

const defaultErrorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(500).json({
        error: err.message,
    });
};