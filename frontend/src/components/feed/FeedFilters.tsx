import type { Filters } from "../../utils/feed";
export const initialFilters: Filters = {
	kind: "all",
	priority: "all",
	status: "all",
	search: "",
};
export function FeedFilters({
	value,
	onChange,
}: {
	value: Filters;
	onChange: (value: Filters) => void;
}) {
	const kinds = [
		["all", "Все"],
		["event", "Мероприятия"],
		["meeting", "Собрания"],
		["poll", "Голосования"],
	] as const;
	return (
		<section className="filter-panel" aria-label="Фильтры ленты">
			<label className="search-box">
				<span aria-hidden="true">⌕</span>
				<span className="sr-only">Поиск по ленте</span>
				<input
					type="search"
					aria-label="Поиск по ленте"
					value={value.search}
					onChange={(e) => onChange({ ...value, search: e.target.value })}
				/>
			</label>
			<div className="filter-row">
				<div className="filter-group">
					{kinds.map(([kind, label]) => (
						<button
							className={`filter-chip ${value.kind === kind ? "selected" : ""}`}
							key={kind}
							aria-pressed={value.kind === kind}
							onClick={() => onChange({ ...value, kind })}
						>
							{label}
						</button>
					))}
				</div>
				<div className="select-stack">
					<select
						className="select-control"
						aria-label="Важность"
						value={value.priority}
						onChange={(e) =>
							onChange({
								...value,
								priority: e.target.value as Filters["priority"],
							})
						}
					>
						<option value="all">Любая важность</option>
						<option value="important">Важные</option>
					</select>
					<select
						className="select-control"
						aria-label="Актуальность"
						value={value.status}
						onChange={(e) =>
							onChange({
								...value,
								status: e.target.value as Filters["status"],
							})
						}
					>
						<option value="all">Любая актуальность</option>
						<option value="active">Актуальные</option>
						<option value="past">Прошедшие / завершённые</option>
					</select>
					<button
						className="text-button"
						onClick={() => onChange(initialFilters)}
					>
						Сбросить
					</button>
				</div>
			</div>
		</section>
	);
}
