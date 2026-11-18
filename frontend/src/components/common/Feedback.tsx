export function Feedback({
	error,
	notice,
}: {
	error?: string;
	notice?: string;
}) {
	return (
		<>
			{error && (
				<div role="alert" className="inline-error">
					{error}
				</div>
			)}
			{notice && (
				<div role="status" className="inline-success">
					{notice}
				</div>
			)}
		</>
	);
}
export function EmptyState({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<div className="empty-state">
			<div className="empty-icon" aria-hidden="true">
				↗
			</div>
			<h2>{title}</h2>
			{description && <p>{description}</p>}
		</div>
	);
}
export function Loading() {
	return (
		<div className="state-card" role="status">
			<span className="loader" />
			Загрузка…
		</div>
	);
}
