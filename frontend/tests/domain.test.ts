import { test } from "node:test";
import assert from "node:assert/strict";
import { proportionalTax } from "../src/utils/proportional-tax.ts";
import { canManage, canUse, isAdmin } from "../src/utils/permissions.ts";
import { makeFeed, filterFeed } from "../src/utils/feed.ts";
import type { CurrentUser, EventItem, PollItem } from "../src/types/index.ts";

test("Permissions deny unknown, inactive and banned users", () => {
	const base: CurrentUser = {
		id: 1,
		fio: "Test",
		telegramId: "1",
		role: "participant",
		isBanned: false,
		isActivated: true,
	};
	assert.equal(canManage(null), false);
	assert.equal(canUse(base), true);
	assert.equal(canManage(base), false);
	assert.equal(canManage({ ...base, role: "moderator" }), true);
	assert.equal(isAdmin({ ...base, role: "moderator" }), false);
	assert.equal(isAdmin({ ...base, role: "admin" }), true);
	assert.equal(canManage({ ...base, role: "admin", isBanned: true }), false);
	assert.equal(
		canManage({ ...base, role: "admin", isActivated: false }),
		false,
	);
});
test("Mixed feed hides hidden events, keeps distinct ids, filters status and search", () => {
	const event: EventItem = {
		id: 1,
		title: "Собрание",
		description: "",
		place: "Зал",
		imageUrl: null,
		accent: "important",
		isHidden: false,
		kind: "meeting",
		date: "2030-02-01T12:00:00Z",
		createdAt: "2030-01-01T10:00:00Z",
	};
	const poll: PollItem = {
		id: 1,
		title: "Решение",
		type: "single",
		isActive: true,
		hasVoted: false,
		deadline: "2029-12-31T12:00:00Z",
		createdAt: "2030-01-01T11:00:00Z",
		options: [],
	};
	const feed = makeFeed(
		[event, { ...event, id: 2, isHidden: true }],
		[poll],
		Date.parse("2030-01-01T12:00:00Z"),
	);
	assert.deepEqual(
		feed.map((i) => i.key),
		["poll-1", "event-1"],
	);
	const filters = {
		kind: "all" as const,
		priority: "all" as const,
		status: "all" as const,
		search: "",
	};
	assert.deepEqual(
		filterFeed(feed, { ...filters, status: "active" }).map((i) => i.key),
		["event-1"],
	);
	assert.equal(filterFeed(feed, { ...filters, search: " ЗАЛ " }).length, 1);
	assert.equal(
		filterFeed(feed, { ...filters, kind: "poll", priority: "important" })
			.length,
		0,
	);
});
test("Proportional allocation has deterministic ties and conserves total", () => {
	const values = [
		{ id: 1, votesCount: 10 },
		{ id: 2, votesCount: 3 },
		{ id: 3, votesCount: 3 },
	];
	assert.deepEqual(
		proportionalTax(values, 1, 0.5).map((o) => o.votesCount),
		[13, 1, 2],
	);
	assert.deepEqual(
		proportionalTax(values, 1, 1).map((o) => o.votesCount),
		[16, 0, 0],
	);
	assert.deepEqual(proportionalTax(values, 1, 0), values);
	assert.equal(values[0].votesCount, 10);
});
test("Allocation rejects invalid inputs and handles empty ballot boxes", () => {
	const options = [
		{ id: 1, votesCount: 0 },
		{ id: 2, votesCount: 0 },
	];
	assert.deepEqual(proportionalTax(options, 1, 0.5), options);
	assert.throws(() => proportionalTax(options, 3, 0.5));
	assert.throws(() => proportionalTax(options, 1, NaN));
	assert.throws(() =>
		proportionalTax([{ id: 1, votesCount: -1 }, options[1]], 1, 0.5),
	);
});
test("Allocation invariants across vote distributions and tax rates", () => {
	for (let a = 0; a < 20; a++)
		for (let b = 0; b < 20; b++)
			for (const rate of [0, 0.01, 0.1, 0.33, 0.5, 0.99, 1]) {
				const input = [
					{ id: 1, votesCount: 5 },
					{ id: 2, votesCount: a },
					{ id: 3, votesCount: b },
				];
				const output = proportionalTax(input, 1, rate);
				assert.equal(
					output.reduce((sum, o) => sum + o.votesCount, 0),
					5 + a + b,
				);
				assert.equal(output[0].votesCount, 5 + Math.floor((a + b) * rate));
				assert.ok(
					output.every(
						(o) => Number.isInteger(o.votesCount) && o.votesCount >= 0,
					),
				);
			}
});
