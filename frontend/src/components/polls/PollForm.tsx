import { useState } from "react";
import { useAction } from "../../hooks/useAction";
import { pollsService } from "../../services/polls.service";
import { Feedback } from "../common/Feedback";
import type { PollItem } from "../../types";
export function PollForm({
	onSaved,
	onCancel,
}: {
	onSaved: (poll: PollItem) => void;
	onCancel: () => void;
}) {
	const action = useAction();
	const [title, setTitle] = useState("");
	const [type, setType] = useState<"single" | "multiple">("single");
	const [deadline, setDeadline] = useState("");
	const [options, setOptions] = useState(["", ""]);
	return (
		<form
			className="event-form"
			onSubmit={(e) => {
				e.preventDefault();
				void action.run(async () => {
					const trimmed = options.map((text) => text.trim());
					if (
						!title.trim() ||
						trimmed.some((text) => !text) ||
						new Set(trimmed.map((text) => text.toLocaleLowerCase("ru-RU")))
							.size !== trimmed.length
					)
						throw new Error(
							"Заполните название и неповторяющиеся варианты ответа.",
						);
					if (
						deadline &&
						(!Number.isFinite(Date.parse(deadline)) ||
							Date.parse(deadline) <= Date.now())
					)
						throw new Error("Срок завершения должен быть в будущем.");
					onSaved(
						await pollsService.create({
							title: title.trim(),
							type,
							deadline: deadline ? new Date(deadline).toISOString() : null,
							options: trimmed,
						}),
					);
				});
			}}
		>
			<fieldset disabled={action.busy}>
				<legend className="sr-only">Новое голосование</legend>
				<label className="field-label">
					Название
					<input
						required
						maxLength={200}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
				</label>
				<label className="field-label">
					Тип
					<select
						value={type}
						onChange={(e) => setType(e.target.value as typeof type)}
					>
						<option value="single">Один вариант</option>
						<option value="multiple">Несколько вариантов</option>
					</select>
				</label>
				{options.map((option, index) => (
					<div className="option-editor" key={index}>
						<label className="field-label">
							Вариант {index + 1}
							<input
								required
								maxLength={300}
								value={option}
								onChange={(e) =>
									setOptions((list) =>
										list.map((text, i) =>
											i === index ? e.target.value : text,
										),
									)
								}
							/>
						</label>
						<button
							className="icon-button danger"
							type="button"
							aria-label={`Удалить вариант ${index + 1}`}
							disabled={options.length <= 2}
							onClick={() =>
								setOptions((list) => list.filter((_, i) => i !== index))
							}
						>
							×
						</button>
					</div>
				))}
				<button
					type="button"
					className="text-button"
					disabled={options.length >= 20}
					onClick={() => setOptions((list) => [...list, ""])}
				>
					＋ Добавить вариант
				</button>
				<label className="field-label">
					Завершить голосование
					<input
						type="datetime-local"
						value={deadline}
						onChange={(e) => setDeadline(e.target.value)}
					/>
					<small>
						Необязательно. Время:{" "}
						{Intl.DateTimeFormat().resolvedOptions().timeZone}
					</small>
				</label>
			</fieldset>
			<Feedback error={action.error} />
			<div className="form-actions">
				<button
					type="button"
					className="button-secondary"
					disabled={action.busy}
					onClick={onCancel}
				>
					Отмена
				</button>
				<button className="button-primary" disabled={action.busy} type="submit">
					Создать голосование
				</button>
			</div>
		</form>
	);
}
