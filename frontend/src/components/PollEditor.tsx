import { useAction } from '../hooks/useRequest';
import { pollsService } from '../services/polls.service';
import { Feedback } from './Feedback';

export function PollEditor() {
  const action = useAction();
  return <form className="panel narrow" onSubmit={e => {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    void action.run(async () => {
      const title = String(fields.get('title')).trim();
      const options = String(fields.get('options')).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (!title) throw new Error('Введите название голосования.');
      if (options.length < 2 || new Set(options.map(s => s.toLocaleLowerCase())).size !== options.length) {
        throw new Error('Введите минимум два варианта. Каждый вариант должен быть уникальным.');
      }
      await pollsService.create({ title, options, type: fields.get('type') === 'multiple' ? 'multiple' : 'single' });
      form.reset();
    }, 'Голосование опубликовано.');
  }}>
    <h2>Новое голосование</h2>
    <label>Название<input name="title" required /></label>
    <label>Тип голосования<select name="type"><option value="single">Один вариант</option><option value="multiple">Несколько вариантов</option></select></label>
    <label>Варианты ответа<textarea name="options" rows={4} required /><small>По одному варианту на строку.</small></label>
    <Feedback {...action} /><button className="primary" disabled={action.busy}>Создать голосование</button>
  </form>;
}
