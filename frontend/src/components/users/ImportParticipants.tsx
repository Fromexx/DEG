import { useState } from "react";
import { useAction } from "../../hooks/useAction";
import { usersService } from "../../services/users.service";
import { Feedback } from "../common/Feedback";
import type { ImportPreview } from "../../types";
export function ImportParticipants({
	onDone,
}: {
	onDone: () => Promise<void>;
}) {
	const action = useAction();
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<ImportPreview | null>(null);
	return (
		<form
			className="event-form"
			onSubmit={(e) => {
				e.preventDefault();
				void action.run(async () => {
					if (preview) {
						const result = await usersService.commitImport(preview.previewId);
						setPreview(null);
						setFile(null);
						action.setNotice(`Добавлено участников: ${result.imported}.`);
						await onDone();
					} else {
						if (!file) throw new Error("Выберите CSV-файл.");
						if (file.size > 5 * 1024 * 1024)
							throw new Error("Размер CSV не должен превышать 5 МБ.");
						setPreview(await usersService.previewImport(file));
					}
				});
			}}
		>
			<p>
				CSV в UTF-8, разделитель — запятая. Столбцы:{" "}
				<code>fio,telegramId,username,cardNumber</code>. Telegram ID и номер
				карточки передаются как строки.
			</p>
			<p className="muted">
				Импорт добавляет участников. Он не заменяет существующую базу и не
				назначает повышенные роли.
			</p>
			<label className="field-label">
				Файл участников
				<input
					type="file"
					accept=".csv,text/csv"
					disabled={action.busy}
					onChange={(e) => {
						setFile(e.target.files?.[0] || null);
						setPreview(null);
						action.setError("");
						action.setNotice("");
					}}
				/>
			</label>
			{preview && (
				<>
					<p>Готово к импорту: {preview.validRows}</p>
					{preview.errors.length > 0 && (
						<div role="alert">
							<p>Исправьте ошибки и загрузите файл повторно:</p>
							<ul>
								{preview.errors.map((error, i) => (
									<li key={i}>
										Строка {error.row}: {error.message}
									</li>
								))}
							</ul>
						</div>
					)}
				</>
			)}
			<Feedback error={action.error} notice={action.notice} />
			<button
				type="submit"
				className="button-primary"
				disabled={
					action.busy ||
					!file ||
					Boolean(
						preview && (preview.errors.length > 0 || preview.validRows === 0),
					)
				}
			>
				{action.busy
					? "Обработка…"
					: preview
						? "Подтвердить импорт"
						: "Проверить файл"}
			</button>
		</form>
	);
}
