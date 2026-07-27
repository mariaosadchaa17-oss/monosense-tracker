# Rivna

Україномовний застосунок для особистих і спільних фінансів: рахунки, витрати,
бюджети, накопичення, борги, аналітика та швидке внесення операцій.

## Стек

- Next.js App Router + TypeScript
- Tailwind CSS 4, власні UI-компоненти у стилі Soft UI, Lucide React
- Supabase PostgreSQL, Auth, Row Level Security
- WebAuthn/passkeys для Face ID, Touch ID, Windows Hello та PIN пристрою
- API НБУ для офіційних курсів валют
- PWA manifest і service worker
- Vercel для production-деплою

## Локальний запуск

```bash
pnpm install
pnpm dev
```

Production-перевірка:

```bash
pnpm build
pnpm lint
node --test tests/rendered-html.test.mjs
```

## Налаштування Supabase

Створіть `.env.local` на основі `.env.example`, додайте URL та ключі Supabase,
після чого послідовно виконайте SQL-міграції з `supabase/migrations`.
Детальна інструкція є у [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Деплой на Vercel

Репозиторій підключений до Vercel. `vercel.json` явно задає Next.js і команду
`pnpm run build`, тому production-артефакти створюються в `.next`.

У Vercel потрібно додати змінні середовища з `.env.example`, а також:

- `NEXT_PUBLIC_APP_URL` — production URL;
- `CRON_SECRET` — секрет cron-endpoint;
- VAPID-ключі — для push-сповіщень;
- Telegram bot token — для швидкого внесення витрат.

## Основні можливості

- захищені маршрути, email/password та біометричний повторний вхід;
- 5-кроковий онбординг українською;
- мультивалютні рахунки, власний курс, перекази, обмін і комісії;
- категорії, теги, імпульсивні витрати, поділ чека, регулярні платежі;
- місячні бюджети, прогноз, алерти 80% і 100%;
- аналітика за місяцями та тижнями;
- цілі, борги, кредитні ліміти і грейс-періоди;
- спільний бюджет з ролями та запрошеннями;
- Telegram, push, PWA, CSV/Excel імпорт та експорт;
- журнал ключових змін і форма зворотного зв’язку.
