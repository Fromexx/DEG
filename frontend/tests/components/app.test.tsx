import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
	render,
	screen,
	waitFor,
	within,
	fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
const user = {
	id: 1,
	telegramId: "101",
	fio: "Проверка роли",
	role: "participant",
	isBanned: false,
	isActivated: true,
};
const capabilities = {
	polls: true,
	users: true,
	registration: true,
	eventVisibility: true,
	eventGallery: true,
	eventKinds: true,
	eventParticipants: true,
	reallocation: true,
	maintenance: true,
};
const event = {
	id: 1,
	title: "Проверка мероприятия",
	description: "Описание",
	place: "Зал",
	date: "2099-02-01T12:00:00Z",
	createdAt: "2026-01-01T10:00:00Z",
	imageUrl: null,
	accent: "important",
	isHidden: false,
	isRegistered: false,
};
const poll = {
	id: 1,
	title: "Проверка голосования",
	type: "single",
	isActive: true,
	deadline: null,
	createdAt: "2026-01-02T10:00:00Z",
	hasVoted: false,
	options: [
		{ id: 1, text: "Первый" },
		{ id: 2, text: "Второй" },
	],
};
type Handler = (init: RequestInit) => Response | Promise<Response>;
let handlers: Record<string, Handler>;
let requests: { path: string; init: RequestInit }[];
function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
function setup(role = "participant", populated = false, caps = capabilities) {
	handlers["GET /api/me"] = () =>
		json({ user: { ...user, role }, capabilities: caps });
	handlers["GET /api/events"] = () => json(populated ? [event] : []);
	handlers["GET /api/polls"] = () => json(populated ? [poll] : []);
	handlers["GET /api/users"] = () => json([{ ...user, id: 2 }]);
}
beforeEach(() => {
	handlers = {};
	requests = [];
	window.Telegram = {
		WebApp: { initData: "signed-test-data", ready: vi.fn(), expand: vi.fn() },
	};
	vi.stubGlobal(
		"fetch",
		vi.fn(async (path: string, init: RequestInit = {}) => {
			requests.push({ path, init });
			return (
				handlers[`${init.method || "GET"} ${path}`]?.(init) ||
				json({ error: "Missing fixture" }, 404)
			);
		}),
	);
	setup();
});
afterEach(() => vi.unstubAllGlobals());
const click = (name: string) =>
	userEvent.click(screen.getByRole("button", { name, exact: true }));
async function start() {
	render(<App />);
	await screen.findByRole("heading", { name: "Лента", exact: true });
}
async function openManagement() {
	await start();
	await click("Управление");
	await screen.findByRole("button", { name: "＋ Создать", exact: true });
}
test("no Telegram session makes zero API calls; old /me grants no permissions", async () => {
	window.Telegram = undefined;
	const view = render(<App />);
	await screen.findByText("Откройте приложение кнопкой в Telegram-боте СПК.");
	expect(requests.length).toBe(0);
	view.unmount();
	window.Telegram = { WebApp: { initData: "signed" } };
	handlers["GET /api/me"] = () =>
		json({ user: { id: 101, first_name: "Telegram" } });
	render(<App />);
	await screen.findByText(
		"Профиль ещё не готов. Обратитесь к администратору СПК.",
	);
	expect(
		screen.queryByRole("button", { name: "Управление", exact: true }),
	).toBeNull();
});
test("empty state has no fake content and participant has no management", async () => {
	await start();
	await screen.findByText("Публикаций пока нет");
	expect(
		screen.queryByRole("button", { name: "Управление", exact: true }),
	).toBeNull();
	expect(
		requests.every(
			(r) =>
				new Headers(r.init.headers).get("Authorization") ===
				"tma signed-test-data",
		),
	).toBe(true);
});
test("registration, cancellation and confirmed vote; no stats requested", async () => {
	setup("participant", true);
	handlers["POST /api/events/1/register"] = () => json({ id: 1 });
	handlers["DELETE /api/events/1/register"] = () => json({ id: 1 });
	handlers["POST /api/polls/1/vote"] = (init) => {
		expect(JSON.parse(init.body as string)).toEqual({ optionIds: [1] });
		return json({ hasVoted: true });
	};
	await start();
	await screen.findByRole("button", { name: event.title });
	await click(event.title);
	await click("Зарегистрироваться");
	await screen.findByText("Вы зарегистрированы");
	await click("Отменить запись");
	await screen.findByText("Запись отменена.");
	await click("Закрыть");
	await click(poll.title);
	await userEvent.click(screen.getByLabelText("Первый"));
	await click("Проголосовать");
	await screen.findByText("✓ Голос учтён");
	expect(screen.queryByRole("button", { name: "Показать голоса" })).toBeNull();
	expect(requests.some((r) => /results|reallocate/.test(r.path))).toBe(false);
});
test("failed vote never reports success", async () => {
	setup("participant", true);
	handlers["POST /api/polls/1/vote"] = () =>
		new Response("<html>Error</html>", { status: 500 });
	await start();
	await screen.findByRole("button", { name: poll.title });
	await click(poll.title);
	await userEvent.click(screen.getByLabelText("Первый"));
	await click("Проголосовать");
	await screen.findByRole("alert");
	expect(screen.queryByText("✓ Голос учтён")).toBeNull();
	expect(
		(screen.getByRole("button", { name: "Проголосовать" }) as HTMLButtonElement)
			.disabled,
	).toBe(false);
});
test("moderator has management but no role selector or statistics", async () => {
	setup("moderator", true);
	await start();
	await screen.findByRole("button", { name: poll.title });
	await click(poll.title);
	expect(screen.queryByRole("button", { name: "Показать голоса" })).toBeNull();
	await click("Закрыть");
	await click("Управление");
	await userEvent.click(
		screen.getAllByRole("button", { name: "Участники", exact: true })[0],
	);
	await screen.findByRole("button", { name: "Заблокировать" });
	expect(screen.queryByRole("combobox", { name: /Роль:/ })).toBeNull();
});
test("unsupported capabilities issue no unimplemented requests", async () => {
	setup("admin", false, { ...capabilities, polls: false, users: false });
	await start();
	await click("Голосования");
	await screen.findByText("Раздел пока недоступен");
	await click("Управление");
	await click("Участники");
	await screen.findByText("Раздел пока недоступен");
	expect(requests.some((r) => /\/api\/(polls|users)/.test(r.path))).toBe(false);
});
test("event form posts multipart once and blocks closing during request", async () => {
	setup("admin");
	let resolveRequest: (value: Response) => void = () => {};
	handlers["POST /api/events"] = (init) => {
		expect(init.body).toBeInstanceOf(FormData);
		expect((init.body as FormData).get("title")).toBe("Новая публикация");
		return new Promise((resolve) => {
			resolveRequest = resolve;
		});
	};
	await openManagement();
	await click("＋ Создать");
	await userEvent.type(screen.getByLabelText("Название"), "Новая публикация");
	fireEvent.change(screen.getByLabelText("Дата и время"), {
		target: { value: "2099-01-01T12:00" },
	});
	await click("Опубликовать");
	await waitFor(() =>
		expect(
			(screen.getByRole("button", { name: "Закрыть" }) as HTMLButtonElement)
				.disabled,
		).toBe(true),
	);
	resolveRequest(json(event, 201));
	await screen.findByText("Публикация сохранена.");
	expect(
		requests.filter((r) => r.path === "/api/events" && r.init.method === "POST")
			.length,
	).toBe(1);
});
test("admin redistribution uses server preview and explicit commit", async () => {
	setup("admin", true);
	const results = {
		totalVoters: 10,
		options: [
			{ id: 1, text: "Первый", votesCount: 6 },
			{ id: 2, text: "Второй", votesCount: 4 },
		],
	};
	handlers["GET /api/polls/1/results"] = () => json(results);
	handlers["POST /api/polls/1/reallocate/preview"] = (init) => {
		expect(JSON.parse(init.body as string)).toEqual({
			targetOptionId: 1,
			rate: 0.5,
			reason: "Причина",
			method: "proportional-tax",
		});
		return json({
			previewId: "preview-1",
			expiresAt: "2099-01-01T00:00:00Z",
			movedVotes: 2,
			options: [
				{ id: 1, text: "Первый", before: 6, after: 8 },
				{ id: 2, text: "Второй", before: 4, after: 2 },
			],
		});
	};
	handlers["POST /api/polls/1/reallocate"] = (init) => {
		expect(JSON.parse(init.body as string)).toEqual({ previewId: "preview-1" });
		return json(results);
	};
	await start();
	await screen.findByRole("button", { name: poll.title });
	await click(poll.title);
	await click("Показать голоса");
	await screen.findByText("Проголосовали: 10");
	await click("Перераспределить голоса");
	await userEvent.click(
		within(
			screen.getByRole("group", { name: "Вариант-получатель" }),
		).getByLabelText("Первый"),
	);
	await userEvent.type(
		screen.getByLabelText("Доля перераспределения, %"),
		"50",
	);
	await userEvent.type(
		screen.getByLabelText("Причина для журнала действий"),
		"Причина",
	);
	await click("Рассчитать");
	await screen.findByRole("table");
	expect(
		requests.filter((r) => r.path === "/api/polls/1/reallocate").length,
	).toBe(0);
	await click("Подтвердить перераспределение");
	await screen.findByText("Проголосовали: 10");
});
test("403 immediately removes privileged UI", async () => {
	setup("admin", true);
	handlers["GET /api/polls/1/results"] = () =>
		json({ error: "Forbidden" }, 403);
	await start();
	await screen.findByRole("button", { name: poll.title });
	await click(poll.title);
	await click("Показать голоса");
	await screen.findByText(
		"Доступ изменился или сессия истекла. Откройте приложение заново.",
	);
	expect(
		screen.queryByRole("button", { name: "Управление", exact: true }),
	).toBeNull();
});
test("independent feed failures keep successful content; search filters it", async () => {
	setup("admin", true);
	handlers["GET /api/polls"] = () =>
		json({ error: "Голосования недоступны" }, 500);
	await start();
	await screen.findByRole("button", { name: event.title });
	await screen.findByText("Голосования: Голосования недоступны");
	await userEvent.type(
		screen.getByRole("searchbox", { name: "Поиск по ленте" }),
		"Не найдено",
	);
	expect(screen.queryByRole("button", { name: event.title })).toBeNull();
	await click("Сбросить");
	await screen.findByRole("button", { name: event.title });
});
test("gallery retry reuses created event instead of posting it again", async () => {
	setup("admin");
	let creates = 0;
	let uploads = 0;
	handlers["POST /api/events"] = () => {
		creates++;
		return json(event, 201);
	};
	handlers["POST /api/events/1/photos"] = () => {
		uploads++;
		return uploads === 1
			? json({ error: "Ошибка загрузки" }, 500)
			: json(event);
	};
	await openManagement();
	await click("＋ Создать");
	await userEvent.type(screen.getByLabelText("Название"), "Публикация");
	fireEvent.change(screen.getByLabelText("Дата и время"), {
		target: { value: "2099-01-01T12:00" },
	});
	await userEvent.upload(
		screen.getByLabelText(/Дополнительные фотографии/),
		new File(["png"], "photo.png", { type: "image/png" }),
	);
	await click("Опубликовать");
	await screen.findByText(/Публикация сохранена, но фотографии не загрузились/);
	await click("Повторить загрузку фото");
	await screen.findByText("Публикация сохранена.");
	expect(creates).toBe(1);
	expect(uploads).toBe(2);
});
test("CSV preview precedes commit; only admin can confirm a role change", async () => {
	setup("admin");
	let commits = 0;
	handlers["PATCH /api/users/2/role"] = () =>
		json({ ...user, id: 2, role: "moderator" });
	handlers["POST /api/users/import/preview"] = () =>
		json({ previewId: "csv-1", validRows: 1, errors: [] });
	handlers["POST /api/users/import"] = () => {
		commits++;
		return json({ imported: 1 });
	};
	await openManagement();
	await click("Участники");
	await screen.findByRole("combobox", { name: /Роль:/ });
	await userEvent.selectOptions(
		screen.getByRole("combobox", { name: /Роль:/ }),
		"moderator",
	);
	await screen.findByText("Подтвердить изменение");
	await click("Подтвердить");
	await screen.findByText("Изменение сохранено.");
	await click("Импорт CSV");
	await userEvent.upload(
		screen.getByLabelText("Файл участников"),
		new File(["fio,telegramId,username,cardNumber\nTest,1,,1"], "users.csv", {
			type: "text/csv",
		}),
	);
	await click("Проверить файл");
	await screen.findByText("Готово к импорту: 1");
	expect(commits).toBe(0);
	await click("Подтвердить импорт");
	await screen.findByText("Добавлено участников: 1.");
	expect(commits).toBe(1);
});
test("editing preserves old cover in multipart and keeps original timezone instant", async () => {
	setup("admin", true);
	const withCover = { ...event, imageUrl: "/uploads/cover.png" };
	let updated = false;
	handlers["GET /api/events"] = () => json([withCover]);
	handlers["GET http://localhost:3000/uploads/cover.png"] = () =>
		new Response("png", { headers: { "Content-Type": "image/png" } });
	// jsdom origin from Vitest is http://localhost:3000; media requests never contain initData.
	handlers["PATCH /api/events/1"] = (init) => {
		const body = init.body as FormData;
		expect(body.get("image")).toBeInstanceOf(File);
		expect(body.get("date")).toBe(new Date(event.date).toISOString());
		updated = true;
		return json(withCover);
	};
	await openManagement();
	await screen.findByRole("button", { name: "Изменить" });
	await click("Изменить");
	await click("Сохранить изменения");
	await screen.findByText("Публикация сохранена.");
	expect(updated).toBe(true);
});
