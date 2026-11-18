# Интеграция с Express: подтверждённое и предлагаемое

Проверено чтением GitHub 17.11.2026:

- https://github.com/Fromexx/DEG/tree/feature/backend
- https://github.com/Fromexx/DEG/tree/feature/bot

Изучены backend/src/index.ts, auth.ts, middleware/roles.ts, upload.ts, modules/events/*, prisma/schema.prisma, frontend/package.json, конфигурация TypeScript и bot/handlers/general.py, keyboards/general_keyboard.py. Это проверка исходников, не запуск удалённого сервера.

## Уже существующие маршруты

| Метод и путь | Формат | Состояние |
|---|---|---|
| GET /api/me | Telegram user | Требуется дополнить профилем БД; сейчас нет роли |
| GET /api/events | Event[] | Есть; сервер должен ограничивать скрытые записи |
| POST /api/events | multipart: title, description, place, date, accent, image | Есть; исправить auth перед requireRole |
| PATCH /api/events/:id | тот же multipart | Есть; без файла обложка сбрасывается в null |
| DELETE /api/events/:id | без тела | Есть; исправить auth |
| POST /api/events/:id/register | без тела | Есть; req.userId сейчас не заполняется |
| DELETE /api/events/:id/register | без тела | Есть; та же проблема |
| GET /api/events/:id/users | список регистраций | Есть, но две ошибки выбора id и нет нужного DTO |

Все JSON-ошибки: `{ "error": "сообщение" }` или `{ "error": ["сообщения"] }`. 401 — неавторизован, 403 — нет доступа, 404 — отсутствует, 409 — конфликт, 422 — валидация. Клиент поддерживает пустой ответ / 204 и JSON. Таймаут — 20 секунд.

## Блокеры в проверенном backend

1. `requireRole` безусловно устанавливает `req.userRole = 'moderator'`. Это заглушка. Требуется роль из БД после валидации initData, проверка isBanned/isActivated. Проверка UI не заменяет серверную авторизацию.
2. POST/PATCH/DELETE мероприятий не используют authMiddleware. Подключить его до проверок ролей и загрузки файлов.
3. authMiddleware валидирует подпись и кладёт initData в res.locals, но не назначает req.userId/req.userRole. Найти User по telegramId и назначить внутренний id. Не использовать Telegram ID как User.id.
4. `/api/me` возвращает данные Telegram, а не профиль СПК. Требуется контракт ниже. Telegram parse использует свои поля; frontend не полагается ни на first_name, ни на firstName.
5. В GET /events/:id/users берётся req.userId вместо req.params.id; затем getEventUsers фильтрует `where: { id: eventId }` вместо `where: { eventId }`. Исправить обе ошибки, выбрать ограниченные поля пользователя через relation.
6. PATCH без изображения записывает imageUrl:null. Frontend временно скачивает имеющуюся обложку и повторно передаёт её как File. Если скачать не удалось, изменение не отправляется. На backend правильнее сохранить прежний imageUrl при отсутствии файла; после исправления убрать совместимый обход в events.service.ts. Обход создаёт новый файл при каждом редактировании — организовать удаление неиспользуемых файлов на сервере.
7. GET /events возвращает и скрытые записи. Frontend скрывает их в ленте, но сервер также должен исключать их для участника. Запретить регистрацию на скрытое/прошедшее событие. Добавить isRegistered текущего пользователя.
8. В src/modules есть только events. Poll/PollOption/Vote существуют в Prisma, но маршрутов нет. Нет маршрутов users, import, gallery, visibility и maintenance.
9. Event не имеет kind/photos. Для собрания нужен kind='meeting', для нескольких фотографий — отдельная связь/модель.
10. Vote имеет @@unique([pollId,userId]), что не позволяет multiple. Для нескольких вариантов нужна модель бюллетеня и выбранных опций либо отдельная уникальность [pollId,userId,optionId] с атомарным ограничением одного бюллетеня. Не включать multiple без исправления модели.
11. defaultErrorMiddleware объявлен, но не подключён; добавить единый обработчик ошибок. BigInt telegramId сериализовать строкой.
12. Бот /start сейчас просто выдаёт кнопку. Проверки членства/активации в прочитанном handler нет; защита обязательна на Express, независимо от наличия кнопки.

## Обязательный контракт сессии (предлагаемый)

`GET /api/me` с `Authorization: tma <window.Telegram.WebApp.initData>` возвращает:

```ts
{
  user: {
    id: number;              // внутренний User.id
    telegramId: string;      // BigInt -> строка
    fio: string;
    username?: string;
    cardNumber?: string;
    role: 'participant' | 'moderator' | 'admin';
    isBanned: boolean;
    isActivated: boolean;
  };
  capabilities: {
    polls: boolean; users: boolean; registration: boolean;
    eventVisibility: boolean; eventGallery: boolean; eventKinds: boolean;
    eventParticipants: boolean; reallocation: boolean; maintenance: boolean;
  };
}
```

Capabilities описывают готовность функций, не заменяют проверку роли. Отсутствующие поля capabilities считаются false. Не возвращать true до реализации и проверки маршрута. Не брать роль из тела запроса, URL, браузерного хранилища или initDataUnsafe. Пользователю без подтверждённой роли frontend не выдаёт доступ к данным приложения.

## Матрица прав

| Действие | Участник | Модератор | Админ |
|---|---:|---:|---:|
| Лента, запись, голос | Да | Да | Да |
| Публикации, закрытие голосований, список записавшихся | Нет | Да | Да |
| Создание/импорт участников, блокировка | Нет | Да | Да |
| Смена ролей | Нет | Нет | Да |
| Статистика, перераспределение | Нет | Нет | Да |
| Очистка контента при maintenance=true | Нет | Да | Да |

Сервер должен запрещать самоблокировку и операции, лишающие систему последнего действующего администратора. Модератор не может обходить ограничения ролей через создание/импорт: role/isActivated/isBanned из импортируемых столбцов не принимать. Активация участника — серверная проверка членства и привязки Telegram при входе через бота; отдельное самоназначение роли на frontend отсутствует.

## Предлагаемые маршруты мероприятий

Основной DTO — `EventItem` в src/types/index.ts. date/createdAt — ISO UTC. isRegistered обязателен при registration=true. kind='event'|'meeting' при eventKinds=true. photos — массив безопасных URL при eventGallery=true.

- POST/PATCH /events: добавить kind, если eventKinds=true. Обложка остаётся в image.
- PATCH /events/:id/visibility: JSON `{isHidden:boolean}` -> EventItem.
- POST /events/:id/photos: multipart photos[] (повторяющееся поле `photos`, до 10 файлов по 5 МиБ) -> полный EventItem. Валидировать все файлы до сохранения, применять транзакционно, повтор операции не должен дублировать уже сохранённые фотографии.
- GET /events/:id/users -> `{id:number,fio:string}[]`, где id — User.id, не EventRegistration.id.
- Повторная запись должна быть идемпотентной (или вернуть понятный 409), отмена — DELETE. Время/видимость/участник проверяются на сервере.

## Предлагаемые маршруты голосования

| Метод и путь | Вход | Выход |
|---|---|---|
| GET /polls | — | PollItem[] |
| POST /polls | {title,type,deadline,options:string[]} | PollItem |
| POST /polls/:id/vote | {optionIds:number[]} | {hasVoted:true} |
| PATCH /polls/:id | {isActive:false} | PollItem |
| GET /polls/:id/results | — | PollResults, только admin |
| POST /polls/:id/reallocate/preview | {targetOptionId,rate,reason,method:'proportional-tax'} | ReallocationPreview, только admin |
| POST /polls/:id/reallocate | {previewId} | PollResults, только admin |

PollItem содержит id,title,type,isActive,deadline,createdAt,options:[{id,text}],hasVoted. **Общий DTO не содержит votesCount, пользователей или статистику, даже если запрос делает админ.** Статистика загружается отдельным защищённым запросом по кнопке.

PollResults: `{totalVoters:number,options:[{id,text,votesCount}]}`. Для multiple totalVoters — число бюллетеней, не сумма отметок. Один бюллетень на пользователя; опции принадлежат опросу, без повторов; single ровно один, multiple хотя бы один. Повторные клики и конкурентные запросы контролируются транзакцией/уникальностью. Просроченные и закрытые опросы не принимают голоса.

ReallocationPreview: `{previewId,expiresAt,movedVotes,options:[{id,text,before,after}]}`. Preview связан с текущей ревизией голосования, параметрами, актором и коротким сроком действия. Commit атомарно проверяет всё повторно, 409 при изменении данных, использованный preview не применяется повторно. Возврат 409 не меняет ни бюллетени, ни статистику. После конфликта в UI выбрать «Изменить параметры» и повторить расчёт.

### Пропорциональный налог — выбранная точная спецификация

Только single. rate от 0 до 1; UI вводит целый процент 1–100. T — сумма голосов всех вариантов, кроме получателя. Перенести M=floor(T*rate). Из каждого донора вычесть floor(M*count/T), затем распределить остаток по убыванию дробной части; при равенстве — по возрастанию id. Получателю добавить M. При T=0 перенос равен нулю. Общая сумма неизменна; отрицательных/дробных голосов нет.

Эталон: src/utils/proportional-tax.ts, unit-тесты проверяют инварианты. Функция не вызывается production-интерфейсом для изменения результатов: сервер остаётся единственным источником истины. Backend должен хранить исходные бюллетени отдельно от корректировок и аудит (актор, время, причина, параметры, до/после); исходная модель AuditLog требует расширения или отдельной модели корректировок. Операция не должна незаметно переписывать выбор участников. Условия допустимости/раскрытия корректировок — правило организации, фиксируемое при внедрении.

## Предлагаемые маршруты участников

- GET /users -> CurrentUser[]. Управляющие роли; ограничивать доступ к персональным полям на сервере.
- POST /users: `{fio,telegramId:string,username,cardNumber:string}` -> CurrentUser. Telegram ID — уникальный положительный числовой идентификатор, а username — необязательный изменяемый атрибут. Только participant по умолчанию; нормализовать, проверять уникальность и длину на сервере.
- PATCH /users/:id/role: `{role}` -> CurrentUser. Только admin; запрет самопонижения в UI, защита последнего админа в API.
- PATCH /users/:id/ban: `{isBanned}` -> CurrentUser. Запрет самоблокировки, защита последнего активного админа.
- POST /users/import/preview: multipart `file`, CSV UTF-8 до 5 МиБ, запятая, заголовок `fio,telegramId,username,cardNumber`. Полноценный CSV parser с кавычками/переносами. Ответ `{previewId,validRows,errors:[{row,message}]}`. Ошибки/дубликаты блокируют весь импорт.
- POST /users/import: `{previewId}` -> `{imported:number}`. Повторная проверка уникальности и транзакция, одноразовый preview, никакой перезаписи существующей БД. Дополнительные столбцы прав отклонять.

## Предлагаемое обслуживание

- POST /maintenance/preview -> `{previewId,events,polls,votes}`.
- DELETE /maintenance: `{previewId,confirmation:'УДАЛИТЬ'}` -> 204.

Очистка ограничена контентом и связанными регистрациями/голосами; пользователи и аудит сохраняются. Сервер связывает preview с актором/ревизией/сроком, проверяет роль повторно и записывает аудит. Нет SQL, произвольного имени таблицы или пути файла от клиента. Это намеренно ограниченная трактовка «очистки БД»; удаление пользователей через эту операцию не предусмотрено.

## Порядок подключения

1. Auth + DB identity + /me + role checks + error handler.
2. Исправить существующие события и регистрацию, вернуть isRegistered.
3. kind/visibility/gallery/participants.
4. Users + CSV + роли/блокировки.
5. Poll routes + исправление multiple schema + закрытые результаты.
6. Аудит/preview/commit корректировок и обслуживания.
7. Включить соответствующие capabilities, прогнать реальные интеграционные сценарии через Telegram.
