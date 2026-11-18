import { useRef, useState } from 'react';
import { eventsService } from '../services/events.service';
import { Feedback, LoadState } from './Feedback';
import { useAction, useResource } from '../hooks/useRequest';
import type { EventItem } from '../types';

function toLocalInput(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function EventEditor({ event, onSave, onCancel }: {
  event: EventItem | null; onSave: () => Promise<void>; onCancel: () => void;
}) {
  const action = useAction();
  return <form className="panel" onSubmit={e => {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    const field = (key: string) => String(fields.get(key) || '').trim();
    void action.run(async () => {
      const image = fields.get('image');
      if (image instanceof File && image.size > 5 * 1024 * 1024) throw new Error('Выберите файл размером до 5 МБ.');
      const payload = { title: field('title'), description: field('description'), place: field('place'),
        date: new Date(field('date')).toISOString(), accent: field('accent'), image: image instanceof File && image.size ? image : null };
      if (!payload.title) throw new Error('Введите название мероприятия.');
      if (event) await eventsService.update(event.id, payload);
      else await eventsService.create(payload);
      form.reset();
      await onSave();
    });
  }}>
    <h2>{event ? 'Изменить мероприятие' : 'Новое мероприятие'}</h2>
    <label>Название<input name="title" required maxLength={200} defaultValue={event?.title} /></label>
    <label>Описание<textarea name="description" rows={3} defaultValue={event?.description ?? ''} /></label>
    <label>Место проведения<input name="place" defaultValue={event?.place ?? ''} /></label>
    <label>Дата и время<input name="date" type="datetime-local" required defaultValue={event ? toLocalInput(event.date) : ''} /></label>
    <label>Акцент<input name="accent" defaultValue={event?.accent ?? ''} /><small>Текст пометки для важного мероприятия.</small></label>
    {event?.imageUrl && <img className="cover" src={event.imageUrl} alt="Текущая обложка" />}
    <label>Обложка<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG или WebP, до 5 МБ</small></label>
    <Feedback {...action} />
    <div className="row"><button className="primary" disabled={action.busy}>{event ? 'Сохранить' : 'Опубликовать'}</button>
      {event && <button type="button" disabled={action.busy} onClick={onCancel}>Отмена</button>}</div>
  </form>;
}

export function EventManager() {
  const list = useResource(eventsService.getManaged);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [notice, setNotice] = useState('');
  const editor = useRef<HTMLDivElement>(null);
  const action = useAction();
  return <div className="columns">
    <div ref={editor}><EventEditor key={editing?.id ?? 'new'} event={editing} onCancel={() => setEditing(null)}
      onSave={async () => {
        setNotice(editing ? 'Изменения сохранены.' : 'Мероприятие опубликовано.');
        setEditing(null);
        await list.refresh();
      }} /><Feedback notice={notice} /></div>
    <section className="panel"><h2>Список мероприятий</h2><LoadState {...list} />
      {list.data?.length === 0 && <p className="muted">Пока нет мероприятий.</p>}
      {list.data?.map(event => <article className="entry" key={event.id}>
        <strong>{event.title}</strong><small>{new Date(event.date).toLocaleString('ru')} · {event.isHidden ? 'Скрыто' : 'Видно участникам'}</small>
        <div className="row"><button onClick={() => {
          setEditing(event); setNotice(''); editor.current?.scrollIntoView({ block: 'start' });
        }}>Изменить</button>
          <button disabled={action.busy} onClick={() => void action.run(async () => {
            await eventsService.setHidden(event.id, !event.isHidden); await list.refresh();
          })}>{event.isHidden ? 'Показать' : 'Скрыть'}</button>
          <button className="danger" disabled={action.busy} onClick={() => {
            if (window.confirm('Удалить мероприятие «' + event.title + '»?')) void action.run(async () => {
              await eventsService.remove(event.id);
              if (editing?.id === event.id) setEditing(null);
              await list.refresh();
            });
          }}>Удалить</button></div>
      </article>)}<Feedback {...action} />
    </section>
  </div>;
}
