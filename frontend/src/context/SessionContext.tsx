import {
	createContext,
	useContext,
	useEffect,
	useState,
	useRef,
	type ReactNode,
} from "react";
import { getSession, noCapabilities } from "../services/users.service";
import { getTelegramInitData } from "../services/api";
import type { Session } from "../types";
type State = {
	session: Session | null;
	loading: boolean;
	error: string;
	refresh: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
	const requestId = useRef(0);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	async function refresh() {
		const currentId = ++requestId.current;
		setLoading(true);
		setSession(null);
		setError("");
		try {
			if (!getTelegramInitData())
				throw new Error("Откройте приложение кнопкой в Telegram-боте СПК.");
			const result = await getSession();
			if (currentId === requestId.current) setSession(result);
		} catch (e) {
			if (currentId === requestId.current) setError((e as Error).message);
		} finally {
			if (currentId === requestId.current) setLoading(false);
		}
	}
	useEffect(() => {
		window.Telegram?.WebApp?.ready?.();
		window.Telegram?.WebApp?.expand?.();
		void refresh();
		const invalidate = () => {
			requestId.current++;
			setLoading(false);
			setSession(null);
			setError(
				"Доступ изменился или сессия истекла. Откройте приложение заново.",
			);
		};
		window.addEventListener("session-invalid", invalidate);
		return () => window.removeEventListener("session-invalid", invalidate);
	}, []);
	return (
		<Context.Provider value={{ session, loading, error, refresh }}>
			{children}
		</Context.Provider>
	);
}
export function useSession() {
	const value = useContext(Context);
	if (!value) throw new Error("SessionProvider required");
	return {
		...value,
		user: value.session?.user || null,
		capabilities: value.session?.capabilities || noCapabilities,
	};
}
