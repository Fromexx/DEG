import type { EventItem, PollItem } from "../types";
export type FeedItem =
	| {
			kind: "event" | "meeting";
			key: string;
			createdAt: string;
			important: boolean;
			active: boolean;
			event: EventItem;
	  }
	| {
			kind: "poll";
			key: string;
			createdAt: string;
			important: boolean;
			active: boolean;
			poll: PollItem;
	  };
export interface Filters {
	kind: "all" | FeedItem["kind"];
	priority: "all" | "important";
	status: "all" | "active" | "past";
	search: string;
}
export function makeFeed(
	events: EventItem[],
	polls: PollItem[],
	now = Date.now(),
): FeedItem[] {
	return [
		...events
			.filter((e) => !e.isHidden)
			.map(
				(event) =>
					({
						kind: event.kind || "event",
						key: `event-${event.id}`,
						createdAt: event.createdAt,
						important: Boolean(event.accent),
						active: Date.parse(event.date) >= now,
						event,
					}) as FeedItem,
			),
		...polls.map(
			(poll) =>
				({
					kind: "poll",
					key: `poll-${poll.id}`,
					createdAt: poll.createdAt,
					important: false,
					active:
						poll.isActive &&
						(!poll.deadline || Date.parse(poll.deadline) > now),
					poll,
				}) as FeedItem,
		),
	].sort(
		(a, b) =>
			(Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) ||
			a.key.localeCompare(b.key),
	);
}
export function filterFeed(items: FeedItem[], filters: Filters) {
	const q = filters.search.trim().toLocaleLowerCase("ru-RU");
	return items.filter((item) => {
		const text =
			"poll" in item
				? item.poll.title
				: `${item.event.title} ${item.event.description || ""} ${item.event.place || ""}`;
		return (
			(filters.kind === "all" || filters.kind === item.kind) &&
			(filters.priority === "all" || item.important) &&
			(filters.status === "all" ||
				(filters.status === "active" ? item.active : !item.active)) &&
			(!q || text.toLocaleLowerCase("ru-RU").includes(q))
		);
	});
}
