import { useEffect, useState } from "react";
import { Modal } from "../common/Modal";
import { Feedback } from "../common/Feedback";
import { useAction } from "../../hooks/useAction";
import { useSession } from "../../context/SessionContext";
import { isAdmin } from "../../utils/permissions";
import { formatDate } from "../../utils/dates";
import { pollsService } from "../../services/polls.service";
import { ReallocationPanel } from "./ReallocationPanel";
import type { PollItem, PollResults } from "../../types";
export function PollDetails({
	poll,
	onClose,
	onChanged,
}: {
	poll: PollItem;
	onClose: () => void;
	onChanged: () => Promise<void>;
}) {
	const { user, capabilities } = useSession();
	const action = useAction();
	const [selected, setSelected] = useState<number[]>([]);
	const [voted, setVoted] = useState(poll.hasVoted);
	const [results, setResults] = useState<PollResults | null>(null);
	const [reallocation, setReallocation] = useState(false);
	const [reallocationBusy, setReallocationBusy] = useState(false);
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	const active =
		poll.isActive && (!poll.deadline || Date.parse(poll.deadline) > now);
	return (
		<Modal
			title={poll.title}
			onClose={onClose}
			busy={action.busy || reallocationBusy}
		>
			<p className="muted">
				{poll.type === "single"
					? "Один вариант ответа"
					: "Несколько вариантов ответа"}
				{poll.deadline ? ` · До ${formatDate(poll.deadline, true)}` : ""}
			</p>
			{voted ? (
				<div className="vote-confirmation" role="status">
					✓ Голос учтён
				</div>
			) : !active ? (
				<p>Голосование завершено.</p>
			) : (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void action.run(async () => {
							if (!selected.length) throw new Error("Выберите вариант ответа.");
							const result = await pollsService.vote(poll.id, selected);
							if (result?.hasVoted !== true)
								throw new Error(
									"Сервис не подтвердил голос. Обновите ленту перед повторной попыткой.",
								);
							setVoted(true);
							await onChanged();
						});
					}}
				>
					<fieldset disabled={action.busy || reallocationBusy}>
						<legend className="sr-only">Варианты ответа</legend>
						{poll.options.map((option) => (
							<label className="poll-option" key={option.id}>
								<input
									type={poll.type === "single" ? "radio" : "checkbox"}
									name={`poll-${poll.id}`}
									checked={selected.includes(option.id)}
									onChange={(e) =>
										setSelected((current) =>
											poll.type === "single"
												? [option.id]
												: e.target.checked
													? [...current, option.id]
													: current.filter((id) => id !== option.id),
										)
									}
								/>
								<span>{option.text}</span>
							</label>
						))}
					</fieldset>
					<button
						className="button-primary"
						disabled={action.busy || reallocationBusy || !selected.length}
						type="submit"
					>
						{action.busy ? "Отправка…" : "Проголосовать"}
					</button>
				</form>
			)}
			<Feedback error={action.error} />
			{isAdmin(user) && (
				<section className="admin-poll-tools">
					<div className="form-actions">
						<button
							className="button-secondary"
							disabled={action.busy || reallocationBusy}
							onClick={() =>
								void action.run(async () => {
									setResults(await pollsService.results(poll.id));
									setReallocation(false);
								})
							}
						>
							Показать голоса
						</button>
						{capabilities.reallocation && (
							<button
								className="button-secondary"
								disabled={
									action.busy || reallocationBusy || poll.type !== "single"
								}
								title={
									poll.type !== "single"
										? "Перераспределение доступно для одного варианта ответа"
										: undefined
								}
								onClick={() => {
									setResults(null);
									setReallocation(true);
								}}
							>
								Перераспределить голоса
							</button>
						)}
					</div>
					{results && (
						<div className="results">
							<p>Проголосовали: {results.totalVoters}</p>
							{results.options.map((option) => (
								<div className="result-row" key={option.id}>
									<span>{option.text}</span>
									<strong>{option.votesCount}</strong>
									<meter
										min={0}
										max={Math.max(1, results.totalVoters)}
										value={option.votesCount}
										aria-label={option.text}
									/>
								</div>
							))}
						</div>
					)}
					{reallocation && (
						<ReallocationPanel
							onBusy={setReallocationBusy}
							poll={poll}
							onDone={(value) => {
								setResults(value);
								setReallocation(false);
								void onChanged();
							}}
						/>
					)}
				</section>
			)}
		</Modal>
	);
}
