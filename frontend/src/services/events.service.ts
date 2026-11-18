import { apiRequest, mediaUrl } from "./api";
import type { CurrentUser, EventItem, EventPayload } from "../types";
export function validateImage(file: File) {
	if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
		throw new Error("Выберите JPG, PNG или WEBP.");
	if (file.size > 5 * 1024 * 1024)
		throw new Error("Размер изображения не должен превышать 5 МБ.");
}
export function toFormData(payload: EventPayload, supportsKinds = false) {
	const body = new FormData();
	for (const key of [
		"title",
		"description",
		"place",
		"date",
		"accent",
	] as const)
		body.append(key, payload[key]);
	if (supportsKinds) body.append("kind", payload.kind);
	if (payload.image) {
		validateImage(payload.image);
		body.append("image", payload.image);
	}
	return body;
}
export const eventsService = {
	// BACKEND: existing Express routes. Multipart field image, maximum 5 MiB.
	list: () => apiRequest<EventItem[]>("/events"),
	create: (payload: EventPayload, kinds: boolean) =>
		apiRequest<EventItem>("/events", {
			method: "POST",
			body: toFormData(payload, kinds),
		}),
	update: async (event: EventItem, payload: EventPayload, kinds: boolean) => {
		// BACKEND COMPAT: PATCH resets imageUrl without a file. Re-upload existing cover to preserve it.
		let image = payload.image;
		if (!image && event.imageUrl) {
			const url = mediaUrl(event.imageUrl);
			if (!url)
				throw new Error(
					"Выберите обложку заново: прежнее изображение недоступно.",
				);
			const response = await fetch(url, {
				signal: AbortSignal.timeout(20_000),
			});
			if (!response.ok)
				throw new Error(
					"Не удалось загрузить прежнюю обложку. Выберите изображение заново.",
				);
			const blob = await response.blob();
			const extensions: Record<string, string> = {
				"image/png": "png",
				"image/jpeg": "jpg",
				"image/webp": "webp",
			};
			const ext = extensions[blob.type];
			if (!ext)
				throw new Error("Прежняя обложка имеет неподдерживаемый формат.");
			image = new File([blob], `cover.${ext}`, { type: blob.type });
		}
		return apiRequest<EventItem>(`/events/${event.id}`, {
			method: "PATCH",
			body: toFormData({ ...payload, image }, kinds),
		});
	},
	remove: (id: number) => apiRequest(`/events/${id}`, { method: "DELETE" }),
	// BACKEND: existing routes; require populated req.userId and per-user registration state in list.
	register: (id: number) =>
		apiRequest(`/events/${id}/register`, { method: "POST" }),
	unregister: (id: number) =>
		apiRequest(`/events/${id}/register`, { method: "DELETE" }),
	// BACKEND REQUIRED: fix route param + service filter; return limited participant fields.
	participants: (id: number) =>
		apiRequest<Pick<CurrentUser, "id" | "fio">[]>(`/events/${id}/users`),
	// BACKEND REQUIRED: new endpoints gated by /me capabilities.
	visibility: (id: number, isHidden: boolean) =>
		apiRequest<EventItem>(`/events/${id}/visibility`, {
			method: "PATCH",
			body: JSON.stringify({ isHidden }),
		}),
	addPhotos: (id: number, files: File[]) => {
		const body = new FormData();
		files.forEach((file) => {
			validateImage(file);
			body.append("photos", file);
		});
		return apiRequest<EventItem>(`/events/${id}/photos`, {
			method: "POST",
			body,
		});
	},
};
