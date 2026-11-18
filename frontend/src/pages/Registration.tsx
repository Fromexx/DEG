import { useAction } from '../hooks/useRequest';
import { usersService } from '../services/users.service';
import { Feedback } from '../components/Feedback';

export function Registration({ onRegistered }: { onRegistered: () => Promise<void> }) {
  const action = useAction();
  return <section className="panel access-card">
    <h1>Регистрация активиста</h1>
    <form onSubmit={e => {
      e.preventDefault();
      const fields = new FormData(e.currentTarget);
      const field = (key: string) => String(fields.get(key) || '').trim();
      void action.run(async () => {
        const profile = { fullName: field('fullName'), telegram: field('telegram'), cardNumber: field('cardNumber') };
        if (Object.values(profile).some(value => !value)) throw new Error('Заполните все поля.');
        await usersService.register(profile);
        await onRegistered();
      });
    }}>
      <label>ФИО<input autoComplete="name" name="fullName" required /></label>
      <label>Telegram<input name="telegram" required autoCapitalize="none" /></label>
      <label>Номер карточки<input name="cardNumber" required /></label>
      <Feedback {...action} />
      <button className="primary" disabled={action.busy}>Зарегистрироваться</button>
    </form>
  </section>;
}
