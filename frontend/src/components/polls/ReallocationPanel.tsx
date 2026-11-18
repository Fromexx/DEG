import { useEffect, useState } from "react";
import { useAction } from "../../hooks/useAction";
import { pollsService } from "../../services/polls.service";
import { Feedback } from "../common/Feedback";
import type { PollItem, PollResults, ReallocationPreview } from "../../types";
export function ReallocationPanel({
	poll,
	onDone,
	onBusy,
}: {
	poll: PollItem;
	onDone: (result: PollResults) => void;
	onBusy: (busy: boolean) => void;
}) {
	const action = useAction();
	useEffect(() => {
		onBusy(action.busy);
		return () => onBusy(false);
	}, [action.busy, onBusy]);
	const [target, setTarget] = useState<number | null>(null);
	const [rate, setRate] = useState("");
	const [reason, setReason] = useState("");
	const [preview, setPreview] = useState<ReallocationPreview | null>(null);
	return (
		<form
			className="event-form reallocation"
			onSubmit={(e) => {
				e.preventDefault();
				void action.run(async () => {
					if (preview) {
						if (Date.parse(preview.expiresAt) <= Date.now()) {
							setPreview(null);
							throw new Error("Расчёт устарел. Выполните его заново.");
						}
						onDone(await pollsService.reallocate(poll.id, preview.previewId));
					} else {
						const value = Number(rate);
						if (
							target === null ||
							!rate ||
							!Number.isFinite(value) ||
							value <= 0 ||
							value > 100 ||
							!reason.trim()
						)
							throw new Error(
								"Выберите вариант, долю от 1 до 100% и укажите причину.",
							);
						setPreview(
							await pollsService.previewReallocation(
								poll.id,
								target,
								value / 100,
								reason.trim(),
							),
						);
					}
				});
			}}
		>
			<h3>Перераспределение голосов</h3>
			<p className="muted">
				Указанная доля голосов остальных вариантов перейдёт выбранному. Итоговое
				количество голосов сохранится.
			</p>
			<fieldset disabled={action.busy || Boolean(preview)}>
				<legend>Вариант-получатель</legend>
				{poll.options.map((option) => (
					<label className="poll-option" key={option.id}>
						<input
							type="radio"
							name="target"
							checked={target === option.id}
							onChange={() => setTarget(option.id)}
						/>
						{option.text}
					</label>
				))}
				<label className="field-label">
					Доля перераспределения, %
					<input
						type="number"
						min="1"
						max="100"
						step="1"
						required
						value={rate}
						onChange={(e) => setRate(e.target.value)}
					/>
				</label>
				<label className="field-label">
					Причина для журнала действий
					<textarea
						required
						maxLength={1000}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
					/>
				</label>
			</fieldset>
			{preview && (
				<>
					<p>
						Будет перенесено голосов: <strong>{preview.movedVotes}</strong>
					</p>
					<table>
						<thead>
							<tr>
								<th>Вариант</th>
								<th>До</th>
								<th>После</th>
							</tr>
						</thead>
						<tbody>
							{preview.options.map((option) => (
								<tr key={option.id}>
									<td>{option.text}</td>
									<td>{option.before}</td>
									<td>{option.after}</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="muted">
						Изменение будет записано в журнал. Исходные бюллетени должны
						сохраняться на сервере.
					</p>
				</>
			)}
			<Feedback error={action.error} />
			<div className="form-actions">
				{preview && (
					<button
						type="button"
						className="button-secondary"
						disabled={action.busy}
						onClick={() => setPreview(null)}
					>
						Изменить параметры
					</button>
				)}
				<button type="submit" className="button-primary" disabled={action.busy}>
					{action.busy
						? "Обработка…"
						: preview
							? "Подтвердить перераспределение"
							: "Рассчитать"}
				</button>
			</div>
		</form>
	);
}
