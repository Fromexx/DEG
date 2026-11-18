import { useState } from "react";
import { useSession } from "../context/SessionContext";
import { canManage } from "../utils/permissions";
import { EventsManager } from "../components/events/EventsManager";
import { PollsManager } from "../components/polls/PollsManager";
import { UsersManager } from "../components/users/UsersManager";
import { MaintenancePanel } from "../components/management/MaintenancePanel";
import { EmptyState } from "../components/common/Feedback";
type Section = "events" | "polls" | "users" | "maintenance";
export function ManagementPage() {
	const { user, capabilities } = useSession();
	const [section, setSection] = useState<Section>("events");
	if (!canManage(user)) return <EmptyState title="Недостаточно прав" />;
	const available =
		section === "events" ||
		(section === "polls" && capabilities.polls) ||
		(section === "users" && capabilities.users) ||
		(section === "maintenance" && capabilities.maintenance);
	return (
		<>
			<section className="page-heading">
				<div>
					<div className="eyebrow">РАБОЧАЯ ОБЛАСТЬ</div>
					<h1>Управление</h1>
					<p>Публикации, голосования и участники сообщества.</p>
				</div>
			</section>
			<nav className="section-nav" aria-label="Разделы управления">
				{(
					[
						["events", "Мероприятия"],
						["polls", "Голосования"],
						["users", "Участники"],
						["maintenance", "Обслуживание"],
					] as const
				).map(([key, label]) => (
					<button
						className={`filter-chip ${key === section ? "selected" : ""}`}
						aria-pressed={key === section}
						key={key}
						onClick={() => setSection(key)}
					>
						{label}
					</button>
				))}
			</nav>
			{!available ? (
				<EmptyState
					title="Раздел пока недоступен"
					description="Доступ появится после подключения сервиса."
				/>
			) : section === "events" ? (
				<EventsManager />
			) : section === "polls" ? (
				<PollsManager />
			) : section === "users" ? (
				<UsersManager />
			) : (
				<MaintenancePanel />
			)}
		</>
	);
}
