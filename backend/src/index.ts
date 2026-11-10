import express, { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { authMiddleware, getInitData } from './auth';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
    url: 'file:./db/dev.db',
});

const prisma = new PrismaClient({ adapter });

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello Prisma with Express!');
});

app.get('/api/me', authMiddleware, (req: Request, res: Response) => {
    const initData = getInitData(res);

    res.json({
        message: 'Ты авторизован',
        user: initData?.user,
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});