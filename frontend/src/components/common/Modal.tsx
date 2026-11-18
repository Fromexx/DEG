import {
	useEffect,
	useId,
	useRef,
	useState,
	useCallback,
	type ReactNode,
} from "react";
import { BusyContext } from "../../context/BusyContext";
export function Modal({
	title,
	children,
	onClose,
	busy = false,
}: {
	title: string;
	children: ReactNode;
	onClose: () => void;
	busy?: boolean;
}) {
	const [operations, setOperations] = useState(0);
	const setBusy = useCallback(
		(delta: number) => setOperations((n) => Math.max(0, n + delta)),
		[],
	);
	const locked = busy || operations > 0;
	const ref = useRef<HTMLDialogElement>(null);
	const heading = useId();
	useEffect(() => {
		const previous = document.activeElement as HTMLElement | null;
		const dialog = ref.current;
		const overflow = document.body.style.overflow;
		dialog?.showModal();
		document.body.style.overflow = "hidden";
		return () => {
			dialog?.close();
			document.body.style.overflow = overflow;
			previous?.focus();
		};
	}, []);
	return (
		<dialog
			ref={ref}
			className="modal"
			aria-labelledby={heading}
			onCancel={(e) => {
				e.preventDefault();
				if (!locked) onClose();
			}}
		>
			<div className="modal-heading">
				<h2 id={heading}>{title}</h2>
				<button
					className="icon-button"
					type="button"
					aria-label="Закрыть"
					disabled={locked}
					onClick={onClose}
				>
					×
				</button>
			</div>
			<BusyContext.Provider value={setBusy}>{children}</BusyContext.Provider>
		</dialog>
	);
}
