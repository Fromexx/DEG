import { useEffect, useState } from "react";
import { useAction } from "../../hooks/useAction";
import { pollsService } from "../../services/polls.service";
import { Modal } from "../common/Modal";
import { EmptyState, Feedback, Loading } from "../common/Feedback";
import { PollForm } from "./PollForm";
import { PollDetails } from "./PollDetails";
import type { PollItem } from "../../types";
export function PollsManager() {
	const [items, setItems] = useState<PollItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [creating, setCreating] = useState(false);
	const [selected, setSelected] = useState<PollItem | null>(null);
	const [closing, setClosing] = useState<PollItem | null>(null);
	const action = useAction();
	async function refresh() {
		setLoading(true);
		setLoadError("");
		try {
			setItems(await pollsService.list());
		} catch (e) {
			setLoadError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => {
		void refresh();
	}, []);
	return (
		<section>
			<div className="section-title">
				<h2>Голосования</h2>
				<div className="form-actions">
					<button
						className="button-secondary"
						disabled={loading}
						onClick={() => void refresh()}
					>
						Обновить
					</button>
					<button className="button-primary" onClick={() => setCreating(true)}>
						＋ Создать
					</button>
				</div>
			</div>
			<Feedback error={loadError || action.error} notice={action.notice} />
			{loading ? (
				<Loading />
			) : !items.length && !loadError ? (
				<EmptyState title="Голосований пока нет" />
			) : (
				<div className="management-list">
					{items.map((poll) => (
						<article className="manage-item" key={poll.id}>
							<div className="manage-info">
								<strong>{poll.title}</strong>
								<span>
									{poll.isActive &&
									(!poll.deadline || Date.parse(poll.deadline) > Date.now())
										? "Открыто"
										: "Завершено"}
								</span>
							</div>
							<div className="manage-actions">
								<button
									className="button-secondary"
									onClick={() => setSelected(poll)}
								>
									Открыть
								</button>
								{poll.isActive && (
									<button
										className="text-button danger"
										onClick={() => {
											action.setError("");
											setClosing(poll);
										}}
									>
										Завершить
									</button>
								)}
							</div>
						</article>
					))}
				</div>
			)}
			{creating && (
				<Modal title="Создать голосование" onClose={() => setCreating(false)}>
					<PollForm
						onCancel={() => setCreating(false)}
						onSaved={(poll) => {
							setItems((list) => [poll, ...list]);
							setCreating(false);
							action.setNotice("Голосование создано.");
						}}
					/>
				</Modal>
			)}
			{selected && (
				<PollDetails
					poll={selected}
					onClose={() => setSelected(null)}
					onChanged={refresh}
				/>
			)}
			{closing && (
				<Modal
					title="Завершить голосование?"
					onClose={() => setClosing(null)}
					busy={action.busy}
				>
					<p>«{closing.title}» больше не будет принимать голоса.</p>
					<Feedback error={action.error} />
					<button
						className="button-danger"
						disabled={action.busy}
						onClick={() =>
							void action.run(async () => {
								const result = await pollsService.close(closing.id);
								setItems((list) =>
									list.map((p) => (p.id === result.id ? result : p)),
								);
								setClosing(null);
							})
						}
					>
						Завершить
					</button>
				</Modal>
			)}
		</section>
	);
}
