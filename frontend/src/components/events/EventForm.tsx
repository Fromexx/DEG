import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "../../context/SessionContext";
import { useAction } from "../../hooks/useAction";
import { eventsService, validateImage } from "../../services/events.service";
import { mediaUrl } from "../../services/api";
import { toLocalInput } from "../../utils/dates";
import { Feedback } from "../common/Feedback";
import type { EventItem, EventPayload } from "../../types";
const empty = (): EventPayload => ({
	title: "",
	description: "",
	place: "",
	date: "",
	accent: "",
	image: null,
	kind: "event",
});
export function EventForm({
	event,
	onSaved,
	onCancel,
}: {
	event?: EventItem;
	onSaved: (event: EventItem) => void;
	onCancel: () => void;
}) {
	const { capabilities } = useSession();
	const action = useAction();
	const [form, setForm] = useState<EventPayload>(() =>
		event
			? {
					title: event.title,
					description: event.description || "",
					place: event.place || "",
					date: toLocalInput(event.date),
					accent: event.accent || "",
					image: null,
					kind: event.kind || "event",
				}
			: empty(),
	);
	const [photos, setPhotos] = useState<File[]>([]);
	const [preview, setPreview] = useState("");
	const [savedEvent, setSavedEvent] = useState<EventItem | null>(null);
	useEffect(() => {
		if (!form.image) {
			setPreview(event?.imageUrl ? mediaUrl(event.imageUrl) : "");
			return;
		}
		const url = URL.createObjectURL(form.image);
		setPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [form.image, event?.imageUrl]);
	function update<K extends keyof EventPayload>(
		key: K,
		value: EventPayload[K],
	) {
		setForm((current) => ({ ...current, [key]: value }));
	}
	async function submit(e: FormEvent) {
		e.preventDefault();
		await action.run(async () => {
			if (!form.title.trim() || !Number.isFinite(Date.parse(form.date)))
				throw new Error("Укажите название, дату и время.");
			const payload = {
				...form,
				title: form.title.trim(),
				date: new Date(form.date).toISOString(),
			};
			let result = savedEvent;
			if (!result) {
				result = event
					? await eventsService.update(event, payload, capabilities.eventKinds)
					: await eventsService.create(payload, capabilities.eventKinds);
				setSavedEvent(result);
			}
			// BACKEND: gallery is a second request. Keep the saved id to avoid duplicate events on retry.
			if (photos.length)
				result = await eventsService.addPhotos(result.id, photos);
			onSaved(result);
		});
	}
	return (
		<form className="event-form" onSubmit={(e) => void submit(e)}>
			<fieldset disabled={action.busy || Boolean(savedEvent)}>
				<legend className="sr-only">Данные мероприятия</legend>
				{capabilities.eventKinds && (
					<label className="field-label">
						Тип публикации
						<select
							value={form.kind}
							onChange={(e) =>
								update("kind", e.target.value as EventPayload["kind"])
							}
						>
							<option value="event">Мероприятие</option>
							<option value="meeting">Собрание</option>
						</select>
					</label>
				)}
				<label className="field-label">
					Название
					<input
						required
						maxLength={200}
						value={form.title}
						onChange={(e) => update("title", e.target.value)}
					/>
				</label>
				<label className="field-label">
					Описание
					<textarea
						rows={5}
						value={form.description}
						onChange={(e) => update("description", e.target.value)}
					/>
				</label>
				<label className="field-label">
					Место проведения
					<input
						value={form.place}
						onChange={(e) => update("place", e.target.value)}
					/>
				</label>
				<label className="field-label">
					Дата и время
					<input
						required
						aria-label="Дата и время"
						type="datetime-local"
						value={form.date}
						onChange={(e) => update("date", e.target.value)}
					/>
					<small>
						Ваше местное время:{" "}
						{Intl.DateTimeFormat().resolvedOptions().timeZone}
					</small>
				</label>
				<label className="field-label">
					Обложка
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => {
							action.setError("");
							const file = e.target.files?.[0];
							try {
								if (file) validateImage(file);
								update("image", file || null);
							} catch (error) {
								action.setError((error as Error).message);
								e.target.value = "";
								update("image", null);
							}
						}}
					/>
					<small>JPG, PNG или WEBP · до 5 МБ</small>
				</label>
				{preview && (
					<img
						className="cover-preview"
						src={preview}
						alt="Выбранная обложка"
					/>
				)}
				{capabilities.eventGallery && (
					<label className="field-label">
						Дополнительные фотографии
						<input
							type="file"
							multiple
							accept="image/jpeg,image/png,image/webp"
							onChange={(e) => {
								const files = [...(e.target.files || [])];
								action.setError("");
								try {
									if (files.length > 10)
										throw new Error("Можно добавить до 10 фотографий за раз.");
									files.forEach(validateImage);
									setPhotos(files);
								} catch (error) {
									action.setError((error as Error).message);
									e.target.value = "";
									setPhotos([]);
								}
							}}
						/>
						<small>До 10 фотографий, каждая до 5 МБ.</small>
					</label>
				)}
				<label className="checkbox-field">
					<input
						type="checkbox"
						checked={Boolean(form.accent)}
						onChange={(e) =>
							update("accent", e.target.checked ? "important" : "")
						}
					/>
					<span>Важная публикация</span>
				</label>
			</fieldset>
			<Feedback error={action.error} />
			{savedEvent && action.error && (
				<p className="muted">
					Публикация сохранена, но фотографии не загрузились. Повторите загрузку
					или завершите без них.
				</p>
			)}
			<div className="form-actions">
				<button
					type="button"
					className="button-secondary"
					disabled={action.busy}
					onClick={() => (savedEvent ? onSaved(savedEvent) : onCancel())}
				>
					{savedEvent ? "Завершить без фото" : "Отмена"}
				</button>
				<button className="button-primary" disabled={action.busy} type="submit">
					{action.busy
						? "Сохранение…"
						: savedEvent
							? "Повторить загрузку фото"
							: event
								? "Сохранить изменения"
								: "Опубликовать"}
				</button>
			</div>
		</form>
	);
}
