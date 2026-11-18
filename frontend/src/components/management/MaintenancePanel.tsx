import { useState } from "react";
import { maintenanceService } from "../../services/maintenance.service";
import { useAction } from "../../hooks/useAction";
import { Feedback } from "../common/Feedback";
export function MaintenancePanel() {
	const action = useAction();
	const [preview, setPreview] = useState<Awaited<
		ReturnType<typeof maintenanceService.preview>
	> | null>(null);
	const [confirmation, setConfirmation] = useState("");
	return (
		<section className="form-panel">
			<h2>Очистка данных</h2>
			<p>
				Удаление всех мероприятий, голосований, регистраций и голосов.
				Участники, роли и журнал действий сохраняются.
			</p>
			<Feedback error={action.error} notice={action.notice} />
			{preview ? (
				<form
					className="event-form"
					onSubmit={(e) => {
						e.preventDefault();
						void action.run(async () => {
							if (confirmation !== "УДАЛИТЬ") return;
							await maintenanceService.clear(preview.previewId);
							setPreview(null);
							setConfirmation("");
							action.setNotice("Данные очищены.");
						});
					}}
				>
					<p>
						Мероприятий: {preview.events} · Голосований: {preview.polls} ·
						Голосов: {preview.votes}
					</p>
					<label className="field-label">
						Для подтверждения введите УДАЛИТЬ
						<input
							value={confirmation}
							disabled={action.busy}
							onChange={(e) => setConfirmation(e.target.value)}
							autoComplete="off"
						/>
					</label>
					<div className="form-actions">
						<button
							className="button-secondary"
							type="button"
							disabled={action.busy}
							onClick={() => {
								setPreview(null);
								setConfirmation("");
							}}
						>
							Отмена
						</button>
						<button
							className="button-danger"
							disabled={action.busy || confirmation !== "УДАЛИТЬ"}
							type="submit"
						>
							Безвозвратно удалить
						</button>
					</div>
				</form>
			) : (
				<button
					className="button-danger"
					disabled={action.busy}
					onClick={() =>
						void action.run(async () =>
							setPreview(await maintenanceService.preview()),
						)
					}
				>
					Проверить объём удаления
				</button>
			)}
		</section>
	);
}
