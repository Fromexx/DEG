import { z } from 'zod';

export const createEventSchema = z.object({
    title: z.string().trim().min(1, 'title is required').max(200, 'title too long'),
    description: z.string().trim().optional(),
    place: z.string().trim().optional(),
    date: z.coerce.date(),
    accent: z.string().trim().optional(),
});

export function parseEventBody(body: unknown) {
    return createEventSchema.safeParse(body);
}