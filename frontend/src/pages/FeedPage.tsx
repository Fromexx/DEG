import { useEffect, useState } from "react";
import { useFeed } from "../hooks/useFeed";
import { useSession } from "../context/SessionContext";
import { makeFeed, filterFeed, type FeedItem } from "../utils/feed";
import { formatDate } from "../utils/dates";
import { FeedFilters, initialFilters } from "../components/feed/FeedFilters";
import { FeedCard } from "../components/feed/FeedCard";
import { EventDetails } from "../components/events/EventDetails";
import { PollDetails } from "../components/polls/PollDetails";
import { EmptyState, Feedback, Loading } from "../components/common/Feedback";
export function FeedPage() {
	const { events, polls, loading, errors, refresh } = useFeed();
	const { capabilities } = useSession();
	const [filters, setFilters] = useState(initialFilters);
	const [selected, setSelected] = useState<FeedItem | null>(null);
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(timer);
	}, []);
	const items = filterFeed(makeFeed(events, polls, now), filters);
	const pinned = items.filter((i) => i.active && i.important);
	const groups = new Map<string, FeedItem[]>();
	items
		.filter((i) => !pinned.includes(i))
		.forEach((item) => {
			const date = formatDate(item.createdAt);
			groups.set(date, [...(groups.get(date) || []), item]);
		});
	const unavailable =
		(filters.kind === "poll" && !capabilities.polls) ||
		(filters.kind === "meeting" && !capabilities.eventKinds);
	const renderCard = (item: FeedItem) => (
		<FeedCard key={item.key} item={item} onOpen={() => setSelected(item)} />
	);
	return (
		<>
			<section className="page-heading">
				<div>
					<div className="eyebrow">ВАШЕ СООБЩЕСТВО</div>
					<h1>Лента</h1>
					<p>Мероприятия, собрания и решения СПК.</p>
				</div>
				<button
					className="button-secondary"
					disabled={loading}
					onClick={() => void refresh()}
				>
					Обновить
				</button>
			</section>
			<FeedFilters value={filters} onChange={setFilters} />
			{errors.map((error) => (
				<Feedback key={error} error={error} />
			))}
			{loading ? (
				<Loading />
			) : (
				<>
					<div className="feed-caption">
						<span>ПУБЛИКАЦИИ</span>
						<span>{items.length}</span>
					</div>
					{!items.length &&
						(unavailable ? (
							<EmptyState
								title="Раздел пока недоступен"
								description="Доступ появится после подключения сервиса."
							/>
						) : !errors.length ? (
							<EmptyState
								title={
									events.length || polls.length
										? "Ничего не найдено"
										: "Публикаций пока нет"
								}
								description={
									events.length || polls.length
										? "Попробуйте изменить фильтры."
										: "Новые мероприятия и голосования появятся здесь."
								}
							/>
						) : null)}
					{pinned.length > 0 && (
						<section className="feed-group">
							<div className="date-divider">
								<span>Важное сейчас</span>
								<i />
							</div>
							<div className="feed-list">{pinned.map(renderCard)}</div>
						</section>
					)}
					{[...groups].map(([date, list]) => (
						<section key={date} className="feed-group">
							<div className="date-divider">
								<span>{date}</span>
								<i />
							</div>
							<div className="feed-list">{list.map(renderCard)}</div>
						</section>
					))}
				</>
			)}
			{selected &&
				("event" in selected ? (
					<EventDetails
						event={selected.event}
						onClose={() => setSelected(null)}
						onChanged={refresh}
					/>
				) : (
					<PollDetails
						poll={selected.poll}
						onClose={() => setSelected(null)}
						onChanged={refresh}
					/>
				))}
		</>
	);
}
