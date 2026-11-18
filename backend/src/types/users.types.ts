export enum Roles {
    participant = 'participant',
    moderator = 'moderator',
    admin = 'admin'
}

export interface CreateUserInput {
    telegramId: string,
    username: string,
    fio: string,
    cardNumber: string
}