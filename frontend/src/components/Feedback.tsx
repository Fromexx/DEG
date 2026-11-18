export function Feedback({ error, notice }: { error?: string; notice?: string }) {
  if (error) return <p className="error" role="alert">{error}</p>;
  if (notice) return <p className="notice" role="status">{notice}</p>;
  return null;
}

export function LoadState({ loading, error, refresh }: {
  loading: boolean; error: string; refresh: () => void;
}) {
  if (loading) return <p role="status" className="muted">Загрузка…</p>;
  if (error) return <div className="panel"><Feedback error={error} /><button onClick={refresh}>Повторить</button></div>;
  return null;
}

export function Empty({ filtered, children }: { filtered: boolean; children: string }) {
  return <p className="empty">{filtered ? 'По выбранным фильтрам ничего не найдено.' : children}</p>;
}
