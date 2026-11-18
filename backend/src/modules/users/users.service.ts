import { prisma } from '../../index';
import { CreateUserInput, Roles } from '../../types/users.types';

export async function getUsers(telegramId: string | null, username: string | null, fio: string | null) {
    return await prisma.user.findMany({
        where: {
            ...(telegramId && { telegramId }),
            ...(username && { username: { contains: username } }),
            ...(fio && { fio: { contains: fio } }),
        },
    });
}

export async function createUser(input: CreateUserInput) {
    return await prisma.user.create({
        data: input
    });
}

export async function updateUserRole(id: number, role: Roles) {
    return await prisma.user.update({
        where: { id },
        data: { role },
    });
}

export async function deleteUser(id: number) {
    return await prisma.user.delete({
        where: { id }
    });
}