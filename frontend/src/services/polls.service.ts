import { apiRequest } from "./api";
import type {
	PollItem,
	PollPayload,
	PollResults,
	ReallocationPreview,
} from "../types";
// BACKEND REQUIRED: all poll routes are proposed. Server must omit counts from public responses
// and protect results/reallocation with admin role, transactions and audit log.
export const pollsService = {
	list: () => apiRequest<PollItem[]>("/polls"),
	create: (payload: PollPayload) =>
		apiRequest<PollItem>("/polls", {
			method: "POST",
			body: JSON.stringify(payload),
		}),
	vote: (id: number, optionIds: number[]) =>
		apiRequest<{ hasVoted: true }>(`/polls/${id}/vote`, {
			method: "POST",
			body: JSON.stringify({ optionIds }),
		}),
	close: (id: number) =>
		apiRequest<PollItem>(`/polls/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ isActive: false }),
		}),
	results: (id: number) => apiRequest<PollResults>(`/polls/${id}/results`),
	previewReallocation: (
		id: number,
		targetOptionId: number,
		rate: number,
		reason: string,
	) =>
		apiRequest<ReallocationPreview>(`/polls/${id}/reallocate/preview`, {
			method: "POST",
			body: JSON.stringify({
				targetOptionId,
				rate,
				reason,
				method: "proportional-tax",
			}),
		}),
	reallocate: (id: number, previewId: string) =>
		apiRequest<PollResults>(`/polls/${id}/reallocate`, {
			method: "POST",
			body: JSON.stringify({ previewId }),
		}),
};
