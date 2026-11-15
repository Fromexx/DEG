import { prisma } from '../../index';
import { CreateEventInput } from '../../types/events.types';

export async function createEvent(input: CreateEventInput) {
    return prisma.event.create({
        data: input
    });
}

export async function updateEvent(id: number, input: CreateEventInput) {
    return prisma.event.update({
        where: { id: id },
        data: input
    });
}

export async function deleteEvent(id: number) {
    return prisma.event.delete({
        where: { id: id }
    });
}

export async function getEvents(title: string | null, place: string | null, date: Date | null) {
    return prisma.event.findMany({
        where: {
        ...(title && { title: { contains: title } }),
        ...(place && { place: { contains: place } }),
        ...(date && {
                date: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lt: new Date(new Date(date).setHours(24, 0, 0, 0)),
                },
            }),
        },
    });
}

export async function registerUser(eventId: number, userId: number) {
    return await prisma.eventRegistration.create({
        data: { eventId, userId }
    });
}

export async function unregisterUser(eventId: number, userId: number) {
    return await prisma.eventRegistration.delete({
        where: { eventId_userId: {eventId, userId}}
    });
}

export async function getEventUsers(eventId: number) {
    return await prisma.eventRegistration.findMany({
        where: { id: eventId }
    })
}