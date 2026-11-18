import { Router, Request, Response } from 'express';
import { requireRole } from '../../middleware/roles';
import { Roles } from '../../types/users.types';
import { createUser, deleteUser, getUsers, updateUserRole } from './users.service';

export const usersRouter = Router();
usersRouter.use(requireRole(Roles.moderator, Roles.admin));

usersRouter.get('/', async (req: Request, res: Response) => {
    const telegramId = typeof req.query.relegramId === 'number' ? req.query.relegramId : null;
    const username = typeof req.query.username === 'string' ? req.query.username : null;
    const fio = typeof req.query.fio === 'string' ? req.query.fio : null;

    const users = await getUsers(telegramId, username, fio);

    res.json(users);
});

usersRouter.post('/', async (req: Request, res: Response) => {
    const user = {
        telegramId: "344",
        username: "@Froms1003",
        fio: "Fromexx",
        cardNumber: "413241"
    };

    const userCreated = await createUser(user);

    res.status(201).json(userCreated);
});

usersRouter.patch('/:id/role', requireRole(Roles.admin), async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const { role } = req.body;

    if (!role || !Object.values(Roles).includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await updateUserRole(id, role);

    res.json(user);
});

usersRouter.delete('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const user = await deleteUser(id);

    res.json(user);
});