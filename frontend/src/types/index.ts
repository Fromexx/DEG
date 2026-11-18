export type Role = "participant" | "moderator" | "admin";
export type Capability =
	| "polls"
	| "users"
	| "registration"
	| "eventVisibility"
	| "eventGallery"
	| "eventKinds"
	| "eventParticipants"
	| "reallocation"
	| "maintenance";
export type Capabilities = Record<Capability, boolean>;
export interface CurrentUser {
	id: number;
	telegramId: string;
	fio: string;
	username?: string;
	cardNumber?: string;
	role: Role;
	isBanned: boolean;
	isActivated: boolean;
}
export interface Session {
	user: CurrentUser;
	capabilities: Capabilities;
}
export interface EventItem {
	id: number;
	title: string;
	description: string | null;
	place: string | null;
	date: string;
	accent: string | null;
	imageUrl: string | null;
	createdAt: string;
	isHidden: boolean;
	kind?: "event" | "meeting";
	photos?: string[];
	isRegistered?: boolean;
}
export interface EventPayload {
	title: string;
	description: string;
	place: string;
	date: string;
	accent: string;
	image: File | null;
	kind: "event" | "meeting";
}
export interface PollOption {
	id: number;
	text: string;
}
export interface PollItem {
	id: number;
	title: string;
	type: "single" | "multiple";
	isActive: boolean;
	deadline: string | null;
	createdAt: string;
	options: PollOption[];
	hasVoted: boolean;
}
export interface PollPayload {
	title: string;
	type: "single" | "multiple";
	deadline: string | null;
	options: string[];
}
export interface PollResults {
	totalVoters: number;
	options: { id: number; text: string; votesCount: number }[];
}
export interface ReallocationPreview {
	previewId: string;
	expiresAt: string;
	movedVotes: number;
	options: { id: number; text: string; before: number; after: number }[];
}
export interface ParticipantInput {
	fio: string;
	telegramId: string;
	username: string;
	cardNumber: string;
}
export interface ImportPreview {
	previewId: string;
	validRows: number;
	errors: { row: number; message: string }[];
}
