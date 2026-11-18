/**
 * Небольшой слой запросов к серверу.
 *
 * Сейчас backend/src/index.ts реализует только GET /api/me.
 * Остальные API-методы появятся после согласования маршрутов с backend-разработчиком.
 */
export interface CurrentUserResponse {
  message?: string;
  user?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        colorScheme?: "light" | "dark";
      };
    };
  }
}

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const initData = getTelegramInitData();

  const response = await fetch("/api/me", {
    headers: {
      Authorization: `tma ${initData}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Не удалось получить профиль: HTTP ${response.status}`);
  }

  return response.json() as Promise<CurrentUserResponse>;
}
