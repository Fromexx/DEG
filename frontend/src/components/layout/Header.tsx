import { useSession } from "../../context/SessionContext";
import { canManage } from "../../utils/permissions";
export type Tab = "feed" | "management";
export function Header({
	tab,
	onTab,
}: {
	tab: Tab;
	onTab: (tab: Tab) => void;
}) {
	const { user } = useSession();
	const roles = {
		participant: "Участник",
		moderator: "Модератор",
		admin: "Администратор",
	};
	return (
		<header className="topbar">
			<button
				className="brand"
				onClick={() => onTab("feed")}
				aria-label="ДЭГ СПК — главная"
			>
				<span className="brand-mark">С</span>
				<span>
					ДЭГ <span className="brand-dot">СПК</span>
				</span>
			</button>
			<nav className="main-nav" aria-label="Основная навигация">
				<button
					className={`nav-link ${tab === "feed" ? "active" : ""}`}
					aria-current={tab === "feed" ? "page" : undefined}
					onClick={() => onTab("feed")}
				>
					Лента
				</button>
				{canManage(user) && (
					<button
						className={`nav-link ${tab === "management" ? "active" : ""}`}
						aria-current={tab === "management" ? "page" : undefined}
						onClick={() => onTab("management")}
					>
						Управление
					</button>
				)}
			</nav>
			{user && (
				<div className="user-chip">
					<span className="user-avatar">{user.fio[0]}</span>
					<span className="user-name">
						{user.fio}
						<small>{roles[user.role]}</small>
					</span>
				</div>
			)}
		</header>
	);
}
