import { useRef, useState, useContext } from "react";
import { BusyContext } from "../context/BusyContext";
export function useAction() {
	const setDialogBusy = useContext(BusyContext);
	const lock = useRef(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	async function run(action: () => Promise<void>) {
		if (lock.current) return;
		lock.current = true;
		setDialogBusy?.(1);
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await action();
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Не удалось выполнить действие.",
			);
		} finally {
			lock.current = false;
			setDialogBusy?.(-1);
			setBusy(false);
		}
	}
	return { busy, error, notice, run, setNotice, setError };
}
