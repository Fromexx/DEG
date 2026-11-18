import { useCallback, useEffect, useState } from "react";
import { eventsService } from "../services/events.service";
import { pollsService } from "../services/polls.service";
import { useSession } from "../context/SessionContext";
import type { EventItem, PollItem } from "../types";
export function useFeed() {
	const { capabilities } = useSession();
	const [events, setEvents] = useState<EventItem[]>([]);
	const [polls, setPolls] = useState<PollItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [errors, setErrors] = useState<string[]>([]);
	const refresh = useCallback(async () => {
		setLoading(true);
		setErrors([]);
		// BACKEND: independent resources; a failed poll request must not hide loaded events.
		const results = await Promise.allSettled([
			eventsService.list(),
			capabilities.polls
				? pollsService.list()
				: Promise.resolve([] as PollItem[]),
		]);
		const messages: string[] = [];
		if (results[0].status === "fulfilled") setEvents(results[0].value);
		else {
			setEvents([]);
			messages.push(`Мероприятия: ${results[0].reason.message}`);
		}
		if (results[1].status === "fulfilled") setPolls(results[1].value);
		else {
			setPolls([]);
			messages.push(`Голосования: ${results[1].reason.message}`);
		}
		setErrors(messages);
		setLoading(false);
	}, [capabilities.polls]);
	useEffect(() => {
		void refresh();
	}, [refresh]);
	return { events, polls, loading, errors, refresh };
}
