import { useEffect, useState } from "react";
import { useAction } from "../../hooks/useAction";
import { useSession } from "../../context/SessionContext";
import { usersService } from "../../services/users.service";
import { isAdmin } from "../../utils/permissions";
import { EmptyState, Feedback, Loading } from "../common/Feedback";
import { Modal } from "../common/Modal";
import { ParticipantForm } from "./ParticipantForm";
import { ImportParticipants } from "./ImportParticipants";
import type { CurrentUser, Role } from "../../types";
const roles: Record<Role, string> = {
	participant: "Участник",
	moderator: "Модератор",
	admin: "Администратор",
};
export function UsersManager() {
	const { user: actor } = useSession();
	const [users, setUsers] = useState<CurrentUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [search, setSearch] = useState("");
	const [dialog, setDialog] = useState<"create" | "import" | null>(null);
	const [change, setChange] = useState<{
		user: CurrentUser;
		role?: Role;
		isBanned?: boolean;
	} | null>(null);
	const action = useAction();
	async function refresh() {
		setLoading(true);
		setLoadError("");
		try {
			setUsers(await usersService.list());
		} catch (e) {
			setLoadError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => {
		void refresh();
	}, []);
	const query = search.trim().toLocaleLowerCase("ru-RU");
	const visible = users.filter((u) =>
		`${u.fio} ${u.telegramId} ${u.username || ""} ${u.cardNumber || ""}`
			.toLocaleLowerCase("ru-RU")
			.includes(query),
	);
	return (
		<section>
			<div className="section-title">
				<h2>Участники</h2>
				<div className="form-actions">
					<button
						className="button-secondary"
						disabled={loading}
						onClick={() => void refresh()}
					>
						Обновить
					</button>
					<button
						className="button-secondary"
						onClick={() => setDialog("import")}
					>
						Импорт CSV
					</button>
					<button
						className="button-primary"
						onClick={() => setDialog("create")}
					>
						＋ Добавить
					</button>
				</div>
			</div>
			<label className="field-label">
				Поиск участников
				<input
					type="search"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</label>
			<Feedback error={loadError || action.error} notice={action.notice} />
			{loading ? (
				<Loading />
			) : !visible.length && !loadError ? (
				<EmptyState
					title={users.length ? "Никого не найдено" : "Участников пока нет"}
				/>
			) : (
				<div className="management-list">
					{visible.map((user) => (
						<article key={user.id} className="manage-item">
							<div className="manage-info">
								<strong>{user.fio}</strong>
								<span>
									{roles[user.role]}
									{user.isBanned
										? " · Заблокирован"
										: !user.isActivated
											? " · Не активирован"
											: ""}
								</span>
								<span>
									Telegram ID: {user.telegramId}
									{user.username ? ` · @${user.username}` : ""}
									{user.cardNumber ? ` · Карточка: ${user.cardNumber}` : ""}
								</span>
							</div>
							<div className="manage-actions">
								{isAdmin(actor) && (
									<label className="field-label">
										Роль
										<select
											aria-label={`Роль: ${user.fio}`}
											value={user.role}
											disabled={action.busy || user.id === actor?.id}
											onChange={(e) => {
												action.setError("");
												setChange({ user, role: e.target.value as Role });
											}}
										>
											{Object.entries(roles).map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
										</select>
									</label>
								)}
								<button
									className="button-secondary"
									disabled={action.busy || user.id === actor?.id}
									onClick={() => {
										action.setError("");
										setChange({ user, isBanned: !user.isBanned });
									}}
								>
									{user.isBanned ? "Разблокировать" : "Заблокировать"}
								</button>
							</div>
						</article>
					))}
				</div>
			)}
			{dialog === "create" && (
				<Modal title="Добавить участника" onClose={() => setDialog(null)}>
					<ParticipantForm
						onSaved={(user) => {
							setUsers((list) => [...list, user]);
							setDialog(null);
							action.setNotice("Участник создан.");
						}}
					/>
				</Modal>
			)}
			{dialog === "import" && (
				<Modal title="Импорт участников" onClose={() => setDialog(null)}>
					<ImportParticipants onDone={refresh} />
				</Modal>
			)}
			{change && (
				<Modal
					title="Подтвердить изменение"
					onClose={() => setChange(null)}
					busy={action.busy}
				>
					<p>
						{change.user.fio}:{" "}
						{change.role
							? `новая роль — ${roles[change.role]}`
							: change.isBanned
								? "заблокировать доступ"
								: "восстановить доступ"}
						.
					</p>
					<Feedback error={action.error} />
					<div className="form-actions">
						<button
							className="button-secondary"
							disabled={action.busy}
							onClick={() => setChange(null)}
						>
							Отмена
						</button>
						<button
							className="button-primary"
							disabled={action.busy}
							onClick={() =>
								void action.run(async () => {
									const result = change.role
										? await usersService.role(change.user.id, change.role)
										: await usersService.ban(
												change.user.id,
												Boolean(change.isBanned),
											);
									setUsers((list) =>
										list.map((u) => (u.id === result.id ? result : u)),
									);
									setChange(null);
									action.setNotice("Изменение сохранено.");
								})
							}
						>
							Подтвердить
						</button>
					</div>
				</Modal>
			)}
		</section>
	);
}
