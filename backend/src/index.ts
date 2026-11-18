import express, { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { authMiddleware, getInitData } from './auth';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { eventsRouter } from './modules/events/events.routes';
import { usersRouter } from './modules/users/users.routes';

const adapter = new PrismaBetterSqlite3({
    url: 'file:./db/dev.db',
});

export const prisma = new PrismaClient({ adapter });
export const app = express();

app.use(express.json());
app.use('/api', authMiddleware);

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

app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);

app.use('/uploads', express.static('uploads'));