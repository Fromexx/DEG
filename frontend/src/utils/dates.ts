export function formatDate(value: string | null | undefined, time = false) {
	if (!value || !Number.isFinite(Date.parse(value))) return "Дата не указана";
	return new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
		...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
	}).format(new Date(value));
}
export function toLocalInput(value: string) {
	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 16);
}
