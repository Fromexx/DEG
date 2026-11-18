import type { FeedItem } from "../../utils/feed";
import { formatDate } from "../../utils/dates";
import { mediaUrl } from "../../services/api";
export function FeedCard({
	item,
	onOpen,
}: {
	item: FeedItem;
	onOpen: () => void;
}) {
	const title = "poll" in item ? item.poll.title : item.event.title;
	return (
		<article className={`event-card ${item.important ? "important" : ""}`}>
			{"event" in item && item.event.imageUrl && (
				<div className="event-cover">
					<img loading="lazy" src={mediaUrl(item.event.imageUrl)} alt="" />
				</div>
			)}
			<div className="event-content">
				<div className="event-meta">
					<span className="type-label">
						<span className="type-dot" />
						{item.kind === "poll"
							? "Голосование"
							: item.kind === "meeting"
								? "Собрание"
								: "Мероприятие"}
					</span>
					{item.important && <span className="priority-label">Важно</span>}
					<span>{item.active ? "Актуально" : "Завершено"}</span>
				</div>
				<h2>
					<button className="title-button" onClick={onOpen}>
						{title}
					</button>
				</h2>
				{"event" in item && item.event.description && (
					<p className="event-description clamped">{item.event.description}</p>
				)}
				<div className="event-bottom">
					{"event" in item ? (
						<>
							<span>{item.event.place}</span>
							<time dateTime={item.event.date}>
								{formatDate(item.event.date, true)}
							</time>
						</>
					) : (
						<span>
							{item.poll.hasVoted
								? "Голос учтён"
								: item.poll.deadline
									? `До ${formatDate(item.poll.deadline, true)}`
									: "Без срока завершения"}
						</span>
					)}
					<button className="text-button" onClick={onOpen}>
						Подробнее ↗
					</button>
				</div>
			</div>
		</article>
	);
}
