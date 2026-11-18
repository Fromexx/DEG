import { useState } from "react";
import { useAction } from "../../hooks/useAction";
import { usersService } from "../../services/users.service";
import { Feedback } from "../common/Feedback";
import type { CurrentUser, ParticipantInput } from "../../types";
export function ParticipantForm({
	onSaved,
}: {
	onSaved: (user: CurrentUser) => void;
}) {
	const action = useAction();
	const [form, setForm] = useState<ParticipantInput>({
		fio: "",
		telegramId: "",
		username: "",
		cardNumber: "",
	});
	return (
		<form
			className="event-form"
			onSubmit={(e) => {
				e.preventDefault();
				void action.run(async () => {
					if (
						!form.fio.trim() ||
						!/^[1-9]\d{0,19}$/.test(form.telegramId.trim()) ||
						!form.cardNumber.trim()
					)
						throw new Error("Заполните ФИО, Telegram ID и номер карточки.");
					onSaved(
						await usersService.create({
							fio: form.fio.trim(),
							telegramId: form.telegramId.trim(),
							username: form.username.trim().replace(/^@/, ""),
							cardNumber: form.cardNumber.trim(),
						}),
					);
				});
			}}
		>
			<fieldset disabled={action.busy}>
				<legend className="sr-only">Новый участник</legend>
				{(
					[
						["fio", "ФИО"],
						["telegramId", "Telegram ID"],
						["username", "Имя пользователя Telegram"],
						["cardNumber", "Номер карточки"],
					] as const
				).map(([key, label]) => (
					<label className="field-label" key={key}>
						{label}
						<input
							required={key !== "username"}
							inputMode={key === "telegramId" ? "numeric" : "text"}
							maxLength={key === "telegramId" ? 20 : 200}
							value={form[key]}
							onChange={(e) =>
								setForm((current) => ({ ...current, [key]: e.target.value }))
							}
						/>
					</label>
				))}
				<p className="muted">
					Новый профиль создаётся с ролью участника. Роль может изменить
					администратор.
				</p>
			</fieldset>
			<Feedback error={action.error} />
			<button type="submit" className="button-primary" disabled={action.busy}>
				Создать участника
			</button>
		</form>
	);
}
