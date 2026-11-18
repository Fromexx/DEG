import { useState } from "react";
import { FeedPage } from "./pages/FeedPage";
import { ManagementPage } from "./pages/ManagementPage";
import { Header, type Tab } from "./components/layout/Header";
import { EmptyState, Feedback, Loading } from "./components/common/Feedback";
import { SessionProvider, useSession } from "./context/SessionContext";
import { canManage, canUse } from "./utils/permissions";
function Workspace() {
	const [tab, setTab] = useState<Tab>("feed");
	const { user, loading, error, refresh } = useSession();
	return (
		<div className="app-shell">
			<Header tab={tab} onTab={setTab} />
			<main className="page-wrap">
				{loading ? (
					<Loading />
				) : !user ? (
					<section className="access-panel">
						<span className="section-kicker">ДЭГ СПК</span>
						<h1>
							События и решения
							<br />
							вашего сообщества
						</h1>
						<p>Мероприятия, собрания и голосования в одном месте.</p>
						<Feedback error={error} />
						<button className="button-primary" onClick={() => void refresh()}>
							Проверить доступ
						</button>
					</section>
				) : !canUse(user) ? (
					<EmptyState
						title={
							user.isBanned ? "Доступ ограничен" : "Профиль ожидает активации"
						}
						description="Обратитесь к администратору СПК."
					/>
				) : tab === "management" && canManage(user) ? (
					<ManagementPage />
				) : (
					<FeedPage />
				)}
			</main>
			<footer className="app-footer">
				ДЭГ СПК <span>·</span> Пространство событий и решений
			</footer>
		</div>
	);
}
export default function App() {
	return (
		<SessionProvider>
			<Workspace />
		</SessionProvider>
	);
}
