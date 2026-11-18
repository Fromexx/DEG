import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError('');
    try {
      const result = await load();
      if (version.current === current) setData(result);
    } catch (err) {
      if (version.current === current) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные.');
        setData(undefined);
      }
    } finally { if (version.current === current) setLoading(false); }
  }, [load]);
  useEffect(() => {
    void refresh();
    return () => { version.current++; };
  }, [refresh]);
  return { data, error, loading, refresh };
}

export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(action: () => Promise<void>, message = '') {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить действие.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { run, busy, error, notice };
}
