import { test, expect, type Page } from "@playwright/test";
// Fixtures exist ONLY in tests. Production has no seeded records or fake auth mode.
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
	description: "Описание публикации",
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
async function setup(
	page: Page,
	role = "participant",
	populated = false,
	caps = capabilities,
) {
	await page.route("https://telegram.org/**", (route) =>
		route.fulfill({ body: "", contentType: "text/javascript" }),
	);
	await page.addInitScript(() => {
		window.Telegram = {
			WebApp: { initData: "signed-test-data", ready() {}, expand() {} },
		};
	});
	await page.route("**/api/**", async (route) => {
		const path = new URL(route.request().url()).pathname;
		const data =
			path === "/api/me"
				? { user: { ...user, role }, capabilities: caps }
				: path === "/api/events"
					? populated
						? [event]
						: []
					: path === "/api/polls"
						? populated
							? [poll]
							: []
						: path === "/api/users"
							? [{ ...user, id: 2 }]
							: undefined;
		if (data !== undefined && route.request().method() === "GET")
			await route.fulfill({ json: data });
		else
			await route.fulfill({
				status: 404,
				json: { error: "Not configured in test" },
			});
	});
}
test("Without Telegram no private data is requested; legacy profile grants no role", async ({
	page,
}) => {
	const requests: string[] = [];
	page.on("request", (r) => {
		if (r.url().includes("/api/")) requests.push(r.url());
	});
	await page.route("https://telegram.org/**", (route) =>
		route.fulfill({ body: "" }),
	);
	await page.goto("/");
	await expect(
		page.getByText("Откройте приложение кнопкой в Telegram-боте СПК."),
	).toBeVisible();
	expect(requests).toHaveLength(0);
	await setup(page);
	await page.route("**/api/me", (route) =>
		route.fulfill({ json: { user: { id: 101, first_name: "Telegram" } } }),
	);
	await page.reload();
	await expect(
		page.getByText("Профиль ещё не готов.", { exact: false }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Управление", exact: true }),
	).toHaveCount(0);
});
test("Empty production state, responsive layout at 390 and 320 pixels", async ({
	page,
}, testInfo) => {
	await setup(page);
	await page.goto("/");
	await expect(page.getByText("Публикаций пока нет")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Управление", exact: true }),
	).toHaveCount(0);
	for (const width of [390, 320]) {
		await page.setViewportSize({ width, height: 844 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
	}
	await page.screenshot({
		path: testInfo.outputPath("mobile.png"),
		fullPage: true,
	});
});
test("Participant registers, votes, and never requests admin statistics", async ({
	page,
}) => {
	await setup(page, "participant", true);
	const requested: string[] = [];
	page.on("request", (r) => requested.push(r.url()));
	await page.route("**/api/events/1/register", (route) =>
		route.fulfill({ status: 201, json: { id: 1 } }),
	);
	await page.route("**/api/polls/1/vote", (route) =>
		route.fulfill({ json: { hasVoted: true } }),
	);
	await page.goto("/");
	await page.getByRole("button", { name: event.title, exact: true }).click();
	await page
		.getByRole("button", { name: "Зарегистрироваться", exact: true })
		.click();
	await expect(
		page.getByText("Вы зарегистрированы", { exact: true }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Отменить запись", exact: true })
		.click();
	await expect(page.getByText("Запись отменена.")).toBeVisible();
	await page.getByRole("button", { name: "Закрыть", exact: true }).click();
	await page.getByRole("button", { name: poll.title, exact: true }).click();
	await page.getByLabel("Первый", { exact: true }).check();
	await page
		.getByRole("button", { name: "Проголосовать", exact: true })
		.click();
	await expect(page.getByText("✓ Голос учтён", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Показать голоса" }),
	).toHaveCount(0);
	expect(
		requested.some(
			(url) => url.includes("/results") || url.includes("/reallocate"),
		),
	).toBe(false);
});
test("Failed vote has no fake success and can be retried", async ({ page }) => {
	await setup(page, "participant", true);
	await page.route("**/api/polls/1/vote", (route) =>
		route.fulfill({ status: 500, body: "<html>Server error</html>" }),
	);
	await page.goto("/");
	await page.getByRole("button", { name: poll.title, exact: true }).click();
	await page.getByLabel("Первый", { exact: true }).check();
	await page
		.getByRole("button", { name: "Проголосовать", exact: true })
		.click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page.getByText("✓ Голос учтён", { exact: true })).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Проголосовать", exact: true }),
	).toBeEnabled();
});
test("Moderator manages users and publications but cannot grant roles or view votes", async ({
	page,
}) => {
	await setup(page, "moderator", true);
	await page.goto("/");
	await page.getByRole("button", { name: poll.title, exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Показать голоса" }),
	).toHaveCount(0);
	await page.getByRole("button", { name: "Закрыть", exact: true }).click();
	await page.getByRole("button", { name: "Управление", exact: true }).click();
	await page
		.getByRole("button", { name: "Участники", exact: true })
		.first()
		.click();
	await expect(
		page.getByRole("button", { name: "Заблокировать", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("combobox", { name: /Роль:/ })).toHaveCount(0);
});
test("Unavailable capabilities do not issue speculative requests", async ({
	page,
}) => {
	await setup(page, "admin", false, {
		...capabilities,
		polls: false,
		users: false,
	});
	const requested: string[] = [];
	page.on("request", (r) => requested.push(r.url()));
	await page.goto("/");
	await page.getByRole("button", { name: "Голосования", exact: true }).click();
	await expect(page.getByText("Раздел пока недоступен")).toBeVisible();
	await page.getByRole("button", { name: "Управление", exact: true }).click();
	await page.getByRole("button", { name: "Участники", exact: true }).click();
	await expect(page.getByText("Раздел пока недоступен")).toBeVisible();
	expect(requested.some((url) => /\/api\/(polls|users)/.test(url))).toBe(false);
});
test("Admin creates real multipart event; duplicate submit and closing are blocked", async ({
	page,
}) => {
	await setup(page, "admin");
	let writes = 0;
	await page.route("**/api/events", async (route) => {
		if (route.request().method() === "GET") return route.fulfill({ json: [] });
		writes++;
		expect(route.request().headers().authorization).toBe(
			"tma signed-test-data",
		);
		expect(route.request().headers()["content-type"]).toContain(
			"multipart/form-data",
		);
		expect(route.request().postData()).toContain("Новая публикация");
		await new Promise((resolve) => setTimeout(resolve, 500));
		await route.fulfill({
			status: 201,
			json: { ...event, title: "Новая публикация" },
		});
	});
	await page.goto("/");
	await page.getByRole("button", { name: "Управление", exact: true }).click();
	await page.getByRole("button", { name: "＋ Создать", exact: true }).click();
	await page.getByLabel("Название", { exact: true }).fill("Новая публикация");
	await page
		.getByLabel("Дата и время", { exact: true })
		.fill("2099-01-01T12:00");
	await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Закрыть", exact: true }),
	).toBeDisabled();
	await expect(page.getByText("Публикация сохранена.")).toBeVisible();
	expect(writes).toBe(1);
});
test("Gallery retry does not create a duplicate publication", async ({
	page,
}) => {
	await setup(page, "admin");
	let creates = 0;
	let uploads = 0;
	await page.route("**/api/events", (route) => {
		if (route.request().method() === "GET") return route.fulfill({ json: [] });
		creates++;
		return route.fulfill({ status: 201, json: event });
	});
	await page.route("**/api/events/1/photos", (route) => {
		uploads++;
		return uploads === 1
			? route.fulfill({ status: 500, json: { error: "Ошибка загрузки фото" } })
			: route.fulfill({ json: event });
	});
	await page.goto("/");
	await page.getByRole("button", { name: "Управление", exact: true }).click();
	await page.getByRole("button", { name: "＋ Создать", exact: true }).click();
	await page.getByLabel("Название", { exact: true }).fill("Новая публикация");
	await page
		.getByLabel("Дата и время", { exact: true })
		.fill("2099-01-01T12:00");
	await page
		.getByLabel("Дополнительные фотографии", { exact: false })
		.setInputFiles({
			name: "photo.png",
			mimeType: "image/png",
			buffer: Buffer.from([137, 80, 78, 71]),
		});
	await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
	await expect(
		page.getByText("Публикация сохранена, но фотографии не загрузились.", {
			exact: false,
		}),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Повторить загрузку фото", exact: true })
		.click();
	await expect(
		page.getByText("Публикация сохранена.", { exact: true }),
	).toBeVisible();
	expect(creates).toBe(1);
	expect(uploads).toBe(2);
});
test("Admin sees server statistics and previews audited redistribution", async ({
	page,
}) => {
	await setup(page, "admin", true);
	const results = {
		totalVoters: 10,
		options: [
			{ id: 1, text: "Первый", votesCount: 6 },
			{ id: 2, text: "Второй", votesCount: 4 },
		],
	};
	await page.route("**/api/polls/1/results", (route) =>
		route.fulfill({ json: results }),
	);
	await page.route("**/api/polls/1/reallocate/preview", (route) => {
		expect(route.request().postDataJSON()).toEqual({
			targetOptionId: 1,
			rate: 0.5,
			reason: "Тест корректировки",
			method: "proportional-tax",
		});
		return route.fulfill({
			json: {
				previewId: "preview-1",
				expiresAt: "2099-01-01T00:00:00Z",
				movedVotes: 2,
				options: [
					{ id: 1, text: "Первый", before: 6, after: 8 },
					{ id: 2, text: "Второй", before: 4, after: 2 },
				],
			},
		});
	});
	await page.route("**/api/polls/1/reallocate", (route) => {
		expect(route.request().postDataJSON()).toEqual({ previewId: "preview-1" });
		return route.fulfill({
			json: {
				...results,
				options: [
					{ id: 1, text: "Первый", votesCount: 8 },
					{ id: 2, text: "Второй", votesCount: 2 },
				],
			},
		});
	});
	await page.goto("/");
	await page.getByRole("button", { name: poll.title, exact: true }).click();
	await page
		.getByRole("button", { name: "Показать голоса", exact: true })
		.click();
	await expect(page.getByText("Проголосовали: 10")).toBeVisible();
	await page
		.getByRole("button", { name: "Перераспределить голоса", exact: true })
		.click();
	await page
		.locator(".reallocation")
		.getByLabel("Первый", { exact: true })
		.check();
	await page
		.getByLabel("Доля перераспределения, %", { exact: true })
		.fill("50");
	await page
		.getByLabel("Причина для журнала действий", { exact: true })
		.fill("Тест корректировки");
	await page.getByRole("button", { name: "Рассчитать", exact: true }).click();
	await expect(
		page.getByText("Будет перенесено голосов:", { exact: false }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Подтвердить перераспределение", exact: true })
		.click();
	await expect(page.getByText("Проголосовали: 10")).toBeVisible();
});
test("Permission revocation removes privileged UI after 403", async ({
	page,
}) => {
	await setup(page, "admin", true);
	await page.route("**/api/polls/1/results", (route) =>
		route.fulfill({ status: 403, json: { error: "Forbidden" } }),
	);
	await page.goto("/");
	await page.getByRole("button", { name: poll.title, exact: true }).click();
	await page
		.getByRole("button", { name: "Показать голоса", exact: true })
		.click();
	await expect(
		page.getByText("Доступ изменился или сессия истекла.", { exact: false }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Управление", exact: true }),
	).toHaveCount(0);
});
test("Import verifies file before commit and role changes need confirmation", async ({
	page,
}) => {
	await setup(page, "admin");
	let commits = 0;
	await page.route("**/api/users/import/preview", (route) =>
		route.fulfill({ json: { previewId: "csv-1", validRows: 1, errors: [] } }),
	);
	await page.route("**/api/users/import", (route) => {
		commits++;
		return route.fulfill({ json: { imported: 1 } });
	});
	await page.route("**/api/users/2/role", (route) =>
		route.fulfill({ json: { ...user, id: 2, role: "moderator" } }),
	);
	await page.goto("/");
	await page.getByRole("button", { name: "Управление", exact: true }).click();
	await page.getByRole("button", { name: "Участники", exact: true }).click();
	await page.getByRole("combobox", { name: /Роль:/ }).selectOption("moderator");
	await expect(
		page.getByText("Подтвердить изменение", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Подтвердить", exact: true }).click();
	await expect(page.getByText("Изменение сохранено.")).toBeVisible();
	await page.getByRole("button", { name: "Импорт CSV", exact: true }).click();
	await page
		.getByLabel("Файл участников", { exact: true })
		.setInputFiles({
			name: "users.csv",
			mimeType: "text/csv",
			buffer: Buffer.from("fio,telegramId,username,cardNumber\nTest,1,,1"),
		});
	await page
		.getByRole("button", { name: "Проверить файл", exact: true })
		.click();
	expect(commits).toBe(0);
	await expect(page.getByText("Готово к импорту: 1")).toBeVisible();
	await page
		.getByRole("button", { name: "Подтвердить импорт", exact: true })
		.click();
	await expect(page.getByText("Добавлено участников: 1.")).toBeVisible();
	expect(commits).toBe(1);
});
test("API failure is distinct from empty state; feed filters hide the right entries", async ({
	page,
}) => {
	await setup(page, "admin", true);
	await page.route("**/api/polls", (route) =>
		route.fulfill({ status: 500, json: { error: "Голосования недоступны" } }),
	);
	await page.goto("/");
	await expect(
		page.getByRole("button", { name: event.title, exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("Голосования: Голосования недоступны"),
	).toBeVisible();
	await page.getByLabel("Поиск по ленте", { exact: true }).fill("Не найдено");
	await expect(
		page.getByRole("button", { name: event.title, exact: true }),
	).toHaveCount(0);
	await page.getByRole("button", { name: "Сбросить", exact: true }).click();
	await expect(
		page.getByRole("button", { name: event.title, exact: true }),
	).toBeVisible();
});
