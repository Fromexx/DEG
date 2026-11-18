import { apiRequest } from "./api";
import type {
	Capabilities,
	CurrentUser,
	ImportPreview,
	ParticipantInput,
	Role,
	Session,
} from "../types";
export const noCapabilities: Capabilities = {
	polls: false,
	users: false,
	registration: false,
	eventVisibility: false,
	eventGallery: false,
	eventKinds: false,
	eventParticipants: false,
	reallocation: false,
	maintenance: false,
};
export async function getSession(): Promise<Session> {
	// BACKEND REQUIRED: current /me returns Telegram user only. Extend with DB user + capabilities.
	const response = await apiRequest<{
		user?: CurrentUser;
		capabilities?: Partial<Capabilities>;
	}>("/me");
	const user = response.user;
	if (
		!user ||
		!Number.isInteger(user.id) ||
		!["participant", "moderator", "admin"].includes(user.role) ||
		typeof user.fio !== "string" ||
		typeof user.isBanned !== "boolean" ||
		typeof user.isActivated !== "boolean"
	)
		throw new Error("Профиль ещё не готов. Обратитесь к администратору СПК.");
	const capabilities = { ...noCapabilities };
	for (const key of Object.keys(capabilities) as (keyof Capabilities)[])
		capabilities[key] = response.capabilities?.[key] === true;
	return { user, capabilities };
}
// BACKEND REQUIRED: /users routes are proposed; see docs/API.md.
export const usersService = {
	list: () => apiRequest<CurrentUser[]>("/users"),
	create: (input: ParticipantInput) =>
		apiRequest<CurrentUser>("/users", {
			method: "POST",
			body: JSON.stringify(input),
		}),
	role: (id: number, role: Role) =>
		apiRequest<CurrentUser>(`/users/${id}/role`, {
			method: "PATCH",
			body: JSON.stringify({ role }),
		}),
	ban: (id: number, isBanned: boolean) =>
		apiRequest<CurrentUser>(`/users/${id}/ban`, {
			method: "PATCH",
			body: JSON.stringify({ isBanned }),
		}),
	previewImport: (file: File) => {
		const body = new FormData();
		body.append("file", file);
		return apiRequest<ImportPreview>("/users/import/preview", {
			method: "POST",
			body,
		});
	},
	commitImport: (previewId: string) =>
		apiRequest<{ imported: number }>("/users/import", {
			method: "POST",
			body: JSON.stringify({ previewId }),
		}),
};
