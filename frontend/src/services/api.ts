const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
	/\/$/,
	"",
);
declare global {
	interface Window {
		Telegram?: {
			WebApp?: { initData?: string; ready?: () => void; expand?: () => void };
		};
	}
}
export class ApiError extends Error {
	readonly status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}
export function getTelegramInitData() {
	return window.Telegram?.WebApp?.initData || "";
}
// BACKEND: signed initData on every request. Express resolves identity, role and permissions.
// Never trust initDataUnsafe, localStorage or query strings for permissions.
export async function apiRequest<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const headers = new Headers(options.headers);
	const initData = getTelegramInitData();
	if (initData) headers.set("Authorization", `tma ${initData}`);
	if (options.body && !(options.body instanceof FormData))
		headers.set("Content-Type", "application/json");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 20_000);
	try {
		const response = await fetch(`${API_BASE}${path}`, {
			...options,
			headers,
			credentials: "same-origin",
			signal: options.signal
				? AbortSignal.any([options.signal, controller.signal])
				: controller.signal,
		});
		const raw = await response.text();
		let payload: unknown;
		try {
			payload = raw ? JSON.parse(raw) : undefined;
		} catch {
			payload = undefined;
		}
		if (!response.ok) {
			if (response.status === 401 || response.status === 403)
				window.dispatchEvent(new CustomEvent("session-invalid"));
			const error = (payload as { error?: unknown } | undefined)?.error;
			const message =
				typeof error === "string"
					? error
					: Array.isArray(error)
						? error.filter((x) => typeof x === "string").join(", ")
						: undefined;
			const messages: Record<number, string> = {
				401: "Сессия истекла. Откройте приложение заново через бота.",
				403: "Недостаточно прав для этого действия.",
				404: "Функция пока недоступна.",
				409: "Данные изменились. Обновите страницу и повторите действие.",
			};
			throw new ApiError(
				message ||
					messages[response.status] ||
					"Не удалось выполнить запрос. Повторите позже.",
				response.status,
			);
		}
		if (response.status === 204 || !raw) return undefined as T;
		if (payload === undefined)
			throw new ApiError("Сервис вернул некорректный ответ.", response.status);
		return payload as T;
	} catch (error) {
		if (error instanceof ApiError || options.signal?.aborted) throw error;
		throw new ApiError(
			controller.signal.aborted
				? "Сервис не ответил вовремя. Попробуйте ещё раз."
				: "Нет связи с сервисом. Проверьте подключение.",
			0,
		);
	} finally {
		clearTimeout(timeout);
	}
}
export function mediaUrl(value: string): string {
	if (value.startsWith("/uploads/"))
		return new URL(value, new URL(API_BASE, window.location.origin)).href;
	if (value.startsWith("/covers/")) return value;
	try {
		const url = new URL(value);
		return ["https:", "http:"].includes(url.protocol) ? url.href : "";
	} catch {
		return "";
	}
}
