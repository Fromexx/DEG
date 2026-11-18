import { useEffect, useState } from "react";
import { useAction } from "../../hooks/useAction";
import { useSession } from "../../context/SessionContext";
import { eventsService } from "../../services/events.service";
import { formatDate } from "../../utils/dates";
import { EmptyState, Feedback, Loading } from "../common/Feedback";
import { Modal } from "../common/Modal";
import { EventForm } from "./EventForm";
import type { EventItem } from "../../types";
export function EventsManager() {
	const { capabilities } = useSession();
	const [items, setItems] = useState<EventItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [editor, setEditor] = useState<EventItem | "new" | null>(null);
	const [removing, setRemoving] = useState<EventItem | null>(null);
	const [participants, setParticipants] = useState<{
		title: string;
		users: { id: number; fio: string }[];
	} | null>(null);
	const action = useAction();
	async function refresh() {
		setLoading(true);
		setLoadError("");
		try {
			setItems(await eventsService.list());
		} catch (e) {
			setLoadError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => {
		void refresh();
	}, []);
	return (
		<section>
			<div className="section-title">
				<div>
					<span className="section-kicker">ПУБЛИКАЦИИ</span>
					<h2>Мероприятия и собрания</h2>
				</div>
				<div className="form-actions">
					<button
						className="button-secondary"
						disabled={loading}
						onClick={() => void refresh()}
					>
						Обновить
					</button>
					<button className="button-primary" onClick={() => setEditor("new")}>
						＋ Создать
					</button>
				</div>
			</div>
			<Feedback error={loadError || action.error} notice={action.notice} />
			{loading ? (
				<Loading />
			) : !items.length && !loadError ? (
				<EmptyState
					title="Мероприятий пока нет"
					description="Создайте первую публикацию."
				/>
			) : (
				<div className="management-list">
					{items.map((event) => (
						<article className="manage-item" key={event.id}>
							<div className="manage-info">
								<strong>{event.title}</strong>
								<span>
									{formatDate(event.date, true)}
									{event.isHidden ? " · Скрыто" : ""}
								</span>
							</div>
							<div className="manage-actions">
								<button
									className="button-secondary"
									onClick={() => setEditor(event)}
								>
									Изменить
								</button>
								{capabilities.eventParticipants && (
									<button
										className="button-secondary"
										disabled={action.busy}
										onClick={() =>
											void action.run(async () =>
												setParticipants({
													title: event.title,
													users: await eventsService.participants(event.id),
												}),
											)
										}
									>
										Участники
									</button>
								)}
								{capabilities.eventVisibility && (
									<button
										className="button-secondary"
										disabled={action.busy}
										onClick={() =>
											void action.run(async () => {
												const updated = await eventsService.visibility(
													event.id,
													!event.isHidden,
												);
												setItems((list) =>
													list.map((e) => (e.id === event.id ? updated : e)),
												);
											})
										}
									>
										{event.isHidden ? "Показать" : "Скрыть"}
									</button>
								)}
								<button
									className="text-button danger"
									onClick={() => {
										action.setError("");
										setRemoving(event);
									}}
								>
									Удалить
								</button>
							</div>
						</article>
					))}
				</div>
			)}
			{editor && (
				<Modal
					title={
						editor === "new" ? "Создать публикацию" : "Изменить публикацию"
					}
					onClose={() => setEditor(null)}
				>
					<EventForm
						event={editor === "new" ? undefined : editor}
						onCancel={() => setEditor(null)}
						onSaved={(event) => {
							setItems((list) => [
								event,
								...list.filter((e) => e.id !== event.id),
							]);
							setEditor(null);
							action.setNotice("Публикация сохранена.");
						}}
					/>
				</Modal>
			)}
			{removing && (
				<Modal
					title="Удалить публикацию?"
					onClose={() => setRemoving(null)}
					busy={action.busy}
				>
					<p>«{removing.title}» и записи участников будут удалены.</p>
					<Feedback error={action.error} />
					<div className="form-actions">
						<button
							className="button-secondary"
							disabled={action.busy}
							onClick={() => setRemoving(null)}
						>
							Отмена
						</button>
						<button
							className="button-danger"
							disabled={action.busy}
							onClick={() =>
								void action.run(async () => {
									await eventsService.remove(removing.id);
									setItems((list) => list.filter((e) => e.id !== removing.id));
									setRemoving(null);
									action.setNotice("Публикация удалена.");
								})
							}
						>
							Удалить
						</button>
					</div>
				</Modal>
			)}
			{participants && (
				<Modal
					title={`Участники: ${participants.title}`}
					onClose={() => setParticipants(null)}
				>
					{participants.users.length ? (
						<ul>
							{participants.users.map((user) => (
								<li key={user.id}>{user.fio}</li>
							))}
						</ul>
					) : (
						<p>Пока никто не зарегистрировался.</p>
					)}
				</Modal>
			)}
		</section>
	);
}
