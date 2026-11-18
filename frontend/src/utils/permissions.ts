import type { CurrentUser } from "../types";
export function canUse(user: CurrentUser | null) {
	return Boolean(user && user.isActivated && !user.isBanned);
}
export function canManage(user: CurrentUser | null) {
	return canUse(user) && (user?.role === "admin" || user?.role === "moderator");
}
export function isAdmin(user: CurrentUser | null) {
	return canUse(user) && user?.role === "admin";
}
