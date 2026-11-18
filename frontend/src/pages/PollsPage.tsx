import { useCallback, useState } from 'react';
import { ApiError } from '../services/api';
import { pollsService } from '../services/polls.service';
import { useAction, useResource } from '../hooks/useRequest';
import { Empty, Feedback, LoadState } from '../components/Feedback';
import type { PollItem, Role } from '../types';

function isOpen(poll: PollItem) {
  return poll.isActive && (!poll.deadline || Date.parse(poll.deadline) > Date.now());
}

function Statistics({ poll }: { poll: PollItem }) {
  const load = useCallback(() => pollsService.stats(poll.id), [poll.id]);
  const stats = useResource(load);
  return <section className="inset">
    <h3>Статистика</h3><LoadState {...stats} />
    {stats.data && <><p>Проголосовали: <b>{stats.data.totalVoters}</b></p><dl>
      {stats.data.options.map(row => <div key={row.optionId}><dt>{poll.options.find(item => item.id === row.optionId)?.text ?? row.optionId}</dt><dd>{row.votesCount}</dd></div>)}
    </dl></>}
  </section>;
}

function Reallocation({ poll, onDone }: { poll: PollItem; onDone: () => void }) {
  const [show, setShow] = useState(false);
  const action = useAction();
  return <div>
    <button aria-expanded={show} onClick={() => setShow(!show)}>Перераспределить голоса</button>
    {show && <form className="inset" onSubmit={e => {
      e.preventDefault();
      const fields = new FormData(e.currentTarget);
      const reason = String(fields.get('reason') || '').trim();
      void action.run(async () => {
        await pollsService.reallocate(poll.id, Number(fields.get('option')), reason);
        setShow(false);
        onDone();
      }, 'Перераспределение выполнено.');
    }}>
      <label>Целевой вариант<select name="option" required defaultValue=""><option disabled value="">Выберите вариант</option>
        {poll.options.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}</select></label>
      <label>Комментарий (необязательно)<textarea name="reason" /></label>
      <button className="primary" disabled={action.busy}>Подтвердить перераспределение</button>
    </form>}
    <Feedback {...action} />
  </div>;
}

function PollCard({ poll, role, onVote }: { poll: PollItem; role: Role; onVote: () => void }) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [stats, setStats] = useState(false);
  const [version, setVersion] = useState(0);
  const action = useAction();
  const open = isOpen(poll);
  return <details className="card">
    <summary><span className="card-head"><strong>{poll.title}</strong><small>{poll.type === 'single' ? 'Один вариант' : 'Несколько вариантов'} · {open ? 'Открыто' : 'Завершено'}</small></span></summary>
    <div className="details">
      {poll.deadline && <p>До {new Date(poll.deadline).toLocaleString('ru')}</p>}
      {poll.hasVoted ? <p className="notice" role="status">Голос учтён</p> : open ? <form onSubmit={e => {
        e.preventDefault();
        if (!chosen.length) return;
        void action.run(async () => {
          if (!isOpen(poll)) throw new Error('Срок голосования истёк.');
          try { await pollsService.vote(poll.id, chosen); }
          catch (err) {
            if (!(err instanceof ApiError) || err.status !== 409) throw err;
            const fresh = await pollsService.getAll();
            if (!fresh.some(item => item.id === poll.id && item.hasVoted)) throw err;
          }
          onVote();
          setVersion(v => v + 1);
        });
      }}>
        <fieldset><legend>{poll.type === 'single' ? 'Выберите один вариант' : 'Выберите один или несколько вариантов'}</legend>
          {poll.options.map(o => <label className="choice" key={o.id}>
            <input type={poll.type === 'single' ? 'radio' : 'checkbox'} name={'vote-' + poll.id} checked={chosen.includes(o.id)}
              onChange={e => setChosen(poll.type === 'single' ? [o.id] : e.target.checked ? [...chosen, o.id] : chosen.filter(id => id !== o.id))} />{o.text}
          </label>)}
        </fieldset>
        <button className="primary" disabled={action.busy || !chosen.length}>Проголосовать</button>
      </form> : <ul>{poll.options.map(o => <li key={o.id}>{o.text}</li>)}</ul>}
      <Feedback {...action} />
      {role !== 'participant' && <div className="poll-tools">
        {role === 'admin' && <button aria-expanded={stats} onClick={() => setStats(!stats)}>{stats ? 'Скрыть статистику' : 'Показать статистику'}</button>}
        <Reallocation poll={poll} onDone={() => setVersion(v => v + 1)} />
      </div>}
      {role === 'admin' && stats && <Statistics key={version} poll={poll} />}
    </div>
  </details>;
}

export function PollsPage({ role }: { role: Role }) {
  const list = useResource(pollsService.getAll);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('open');
  const [voted, setVoted] = useState<number[]>([]);
  const polls = (list.data || []).map(p => voted.includes(p.id) ? { ...p, hasVoted: true } : p)
    .filter(p => p.title.toLowerCase().includes(query.trim().toLowerCase()) &&
      (status === 'all' || (status === 'open' && isOpen(p)) || (status === 'voted' && p.hasVoted) || (status === 'closed' && !isOpen(p))));
  return <>
    <div className="filters"><label>Поиск<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>Статус<select value={status} onChange={e => setStatus(e.target.value)}>
        <option value="open">Доступные</option><option value="voted">Я голосовал(а)</option><option value="closed">Завершённые</option><option value="all">Все</option>
      </select></label></div>
    <LoadState {...list} />
    {!list.loading && !list.error && !polls.length && <Empty filtered={Boolean(list.data?.length || query.trim())}>Пока нет голосований.</Empty>}
    {polls.map(p => <PollCard key={p.id} poll={p} role={role} onVote={() => setVoted(ids => [...ids, p.id])} />)}
  </>;
}
