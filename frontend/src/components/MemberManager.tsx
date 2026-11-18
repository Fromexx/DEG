import { useState } from 'react';
import { usersService } from '../services/users.service';
import { Feedback, LoadState } from './Feedback';
import { useAction, useResource } from '../hooks/useRequest';
import { roleLabels, type CurrentUser, type Role } from '../types';

export function MemberManager({ user, refreshSession }: { user: CurrentUser; refreshSession: () => Promise<void> }) {
  const list = useResource(usersService.list);
  const action = useAction();
  const [query, setQuery] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const members = list.data?.filter(m => [m.fullName, m.cardNumber, m.telegram].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="columns">
    <form className="panel" onSubmit={e => {
      e.preventDefault();
      const form = e.currentTarget;
      const file = new FormData(form).get('file');
      setImportMessage('');
      void action.run(async () => {
        if (!(file instanceof File) || !file.size) throw new Error('Выберите непустой CSV-файл.');
        const result = await usersService.importCsv(file);
        setImportMessage('Импортировано участников: ' + result.imported);
        form.reset(); await list.refresh();
      });
    }}>
      <h2>Импорт участников</h2>
      <label>CSV-файл<input type="file" name="file" accept=".csv,text/csv" required /></label>
      <small>Файл UTF-8 с разделителем «запятая». Первая строка — fullName,telegram,cardNumber.</small>
      <button className="primary" disabled={action.busy}>Загрузить список</button>
      <Feedback notice={importMessage} />
    </form>
    <section className="panel"><h2>Участники</h2>
      <label>Поиск по ФИО, Telegram или карточке<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <LoadState {...list} />
      {members?.length === 0 && <p className="muted">{query ? 'Совпадений нет.' : 'Список пуст.'}</p>}
      {members?.map(m => <article className="entry" key={m.id}>
        <strong>{m.fullName}</strong><small>{m.telegram} · Карточка {m.cardNumber}</small>
        <p>{roleLabels[m.role]}{m.isBanned && ' · Заблокирован'}</p>
        {user.role === 'admin' && <label>Роль<select value={m.role} disabled={action.busy} onChange={e => {
          const role = e.target.value as Role;
          if (window.confirm('Назначить роль «' + roleLabels[role] + '» участнику ' + m.fullName + '?')) {
            void action.run(async () => {
              await usersService.setRole(m.id, role);
              if (m.id === user.id) await refreshSession();
              else await list.refresh();
            });
          }
        }}>{(Object.keys(roleLabels) as Role[]).map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>}
        <button disabled={action.busy} onClick={() => {
          if (window.confirm((m.isBanned ? 'Разблокировать ' : 'Заблокировать ') + m.fullName + '?')) {
            void action.run(async () => {
              await usersService.setBan(m.id, !m.isBanned);
              if (m.id === user.id) await refreshSession();
              else await list.refresh();
            });
          }
        }}>{m.isBanned ? 'Разблокировать' : 'Заблокировать'}</button>
      </article>)}
    </section><Feedback {...action} />
  </div>;
}
