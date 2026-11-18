import { useState } from "react";
import { Modal } from "../common/Modal";
import { Feedback } from "../common/Feedback";
import { useSession } from "../../context/SessionContext";
import { useAction } from "../../hooks/useAction";
import { eventsService } from "../../services/events.service";
import { mediaUrl } from "../../services/api";
import { formatDate } from "../../utils/dates";
import type { EventItem } from "../../types";
export function EventDetails({
	event,
	onClose,
	onChanged,
}: {
	event: EventItem;
	onClose: () => void;
	onChanged: () => Promise<void>;
}) {
	const { capabilities } = useSession();
	const action = useAction();
	const [registered, setRegistered] = useState(event.isRegistered);
	const past = Date.parse(event.date) < Date.now();
	return (
		<Modal title={event.title} onClose={onClose} busy={action.busy}>
			{event.imageUrl && (
				<img
					className="detail-cover"
					src={mediaUrl(event.imageUrl)}
					alt="Обложка мероприятия"
				/>
			)}
			<div className="detail-meta">
				<span>{formatDate(event.date, true)}</span>
				{event.place && <span>{event.place}</span>}
				{event.accent && (
					<span className="priority-label">
						{event.accent === "important" ? "Важно" : event.accent}
					</span>
				)}
			</div>
			{event.description && (
				<p className="detail-description">{event.description}</p>
			)}
			{Boolean(event.photos?.length) && (
				<div className="photo-grid">
					{event.photos?.map((url, index) => (
						<a
							key={`${url}-${index}`}
							href={mediaUrl(url)}
							target="_blank"
							rel="noreferrer"
						>
							<img src={mediaUrl(url)} alt={`Фотография ${index + 1}`} />
						</a>
					))}
				</div>
			)}
			<Feedback error={action.error} notice={action.notice} />
			{registered === true && (
				<p className="inline-success">Вы зарегистрированы</p>
			)}
			{!capabilities.registration || registered === undefined ? (
				<p className="muted">Запись на мероприятие пока недоступна.</p>
			) : (
				<button
					className={registered ? "button-secondary" : "button-primary"}
					disabled={action.busy || past}
					onClick={() =>
						void action.run(async () => {
							// BACKEND: reflect only confirmed server mutations; state survives a failed list refresh.
							if (registered) await eventsService.unregister(event.id);
							else await eventsService.register(event.id);
							setRegistered(!registered);
							action.setNotice(
								registered ? "Запись отменена." : "Вы записаны на мероприятие.",
							);
							await onChanged();
						})
					}
				>
					{past
						? "Мероприятие прошло"
						: action.busy
							? "Сохранение…"
							: registered
								? "Отменить запись"
								: "Зарегистрироваться"}
				</button>
			)}
		</Modal>
	);
}
