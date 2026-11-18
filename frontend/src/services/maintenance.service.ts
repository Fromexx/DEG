import { apiRequest } from "./api";
// BACKEND REQUIRED: expiring preview bound to DB revision + actor, transactional audited deletion.
export const maintenanceService = {
	preview: () =>
		apiRequest<{
			previewId: string;
			events: number;
			polls: number;
			votes: number;
		}>("/maintenance/preview", { method: "POST" }),
	clear: (previewId: string) =>
		apiRequest("/maintenance", {
			method: "DELETE",
			body: JSON.stringify({ previewId, confirmation: "УДАЛИТЬ" }),
		}),
};
