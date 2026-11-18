/** Reference algorithm for the future server implementation. Not used to mutate UI counts.
 * Single-choice polls only. Preserve ballots, store an audited adjustment separately.
 * Largest remainders apportion floor(totalOtherVotes * rate); ties use option id.
 */
export function proportionalTax(
	options: { id: number; votesCount: number }[],
	targetId: number,
	rate: number,
) {
	if (!Number.isFinite(rate) || rate < 0 || rate > 1)
		throw new Error("Rate must be between 0 and 1");
	if (
		options.length < 2 ||
		new Set(options.map((o) => o.id)).size !== options.length ||
		!options.some((o) => o.id === targetId)
	)
		throw new Error("Invalid options");
	if (
		options.some(
			(o) =>
				!Number.isSafeInteger(o.id) ||
				!Number.isSafeInteger(o.votesCount) ||
				o.votesCount < 0,
		)
	)
		throw new Error("Invalid count");
	const donors = options.filter((o) => o.id !== targetId);
	const total = donors.reduce((sum, o) => sum + o.votesCount, 0);
	const overall = options.reduce((sum, o) => sum + o.votesCount, 0);
	if (!Number.isSafeInteger(overall))
		throw new Error("Total exceeds safe integer");
	const moved = Math.floor(total * rate);
	const shares = donors.map((o) => {
		const exact = total ? moved * (o.votesCount / total) : 0;
		return {
			id: o.id,
			take: Math.floor(exact),
			remainder: exact - Math.floor(exact),
		};
	});
	let remaining = moved - shares.reduce((sum, s) => sum + s.take, 0);
	shares.sort((a, b) => b.remainder - a.remainder || a.id - b.id);
	for (const share of shares) {
		if (remaining > 0) {
			share.take++;
			remaining--;
		}
	}
	const deductions = new Map(shares.map((s) => [s.id, s.take]));
	return options.map((o) => ({
		...o,
		votesCount:
			o.id === targetId
				? o.votesCount + moved
				: o.votesCount - (deductions.get(o.id) || 0),
	}));
}
