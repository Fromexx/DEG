import { createContext } from "react";
// Keep a dialog open while any child form is committing a request.
export const BusyContext = createContext<((delta: number) => void) | null>(
	null,
);
