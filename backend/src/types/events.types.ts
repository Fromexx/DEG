export interface CreateEventInput {
    title: string;
    description?: string | null;
    place?: string | null;
    date: Date;
    accent?: string | null;
    imageUrl?: string | null;
    createdById?: number | null;
}