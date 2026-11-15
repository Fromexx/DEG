import { Router, Request, Response } from 'express';
import { requireRole } from '../../middleware/roles';
import { upload } from '../../middleware/upload';
import { parseEventBody } from './events.validation';
import { createEvent, updateEvent, deleteEvent, getEvents, registerUser, unregisterUser, getEventUsers } from './events.service';
import { authMiddleware } from '../../auth';
import { Roles } from '../../types/user.types';

export const eventsRouter = Router();

eventsRouter.post('/', requireRole(String(Roles.moderator), String(Roles.admin)), upload.single('image'), async (req: Request, res: Response) => {
    const result = parseEventBody(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
    }

    const event = await createEvent({
        title: result.data.title,
        description: result.data.description ?? null,
        place: result.data.place ?? null,
        date: result.data.date,
        accent: result.data.accent ?? null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json(event);
});

eventsRouter.patch('/:id', requireRole(String(Roles.moderator), String(Roles.admin)), upload.single('image'), async (req: Request, res: Response) => {
    const result = parseEventBody(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
    }

    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const event = await updateEvent(id, {
        title: result.data.title,
        description: result.data.description ?? null,
        place: result.data.place ?? null,
        date: result.data.date,
        accent: result.data.accent ?? null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json(event);
});

eventsRouter.delete('/:id', requireRole(String(Roles.moderator), String(Roles.admin)), async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const event = await deleteEvent(id);

    res.status(201).json(event);
});

eventsRouter.get('/', async (req: Request, res: Response) => {
    const title = typeof req.query.title === 'string' ? req.query.title : null;
    const place = typeof req.query.place === 'string' ? req.query.place : null;
    const date = typeof req.query.date === 'string' ? new Date(req.query.date) : null;

    const events = await getEvents(title, place, date);

    res.json(events);
});

eventsRouter.post('/:id/register', authMiddleware, async (req: Request, res: Response) => {
    const eventId = Number(req.params.id);
    const userId = Number(req.userId);
    if (Number.isNaN(eventId) || Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const eventRegistration = await registerUser(eventId, userId);

    res.status(201).json(eventRegistration);
});

eventsRouter.delete('/:id/register', authMiddleware, async (req: Request, res: Response) => {
    const eventId = Number(req.params.id);
    const userId = Number(req.userId);
    if (Number.isNaN(eventId) || Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const eventRegistration = await unregisterUser(eventId, userId);

    res.status(201).json(eventRegistration);
});

eventsRouter.get('/:id/users', authMiddleware, requireRole(String(Roles.moderator), String(Roles.admin)), async (req: Request, res: Response) => {
    const id = Number(req.userId);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const users = await getEventUsers(id);

    res.json(users);
});