# Підключення Supabase

1. Створіть проєкт у Supabase.
2. Відкрийте **SQL Editor** і послідовно виконайте:
   - `supabase/migrations/202607270001_initial_finance_schema.sql`;
   - `supabase/migrations/202607270002_atomic_finance_operations.sql`.
   - `supabase/migrations/202607270003_goals_and_recurring.sql`.
   Друга міграція додає атомарні операції, які одночасно змінюють транзакцію і
   баланс рахунку, а також безпечний переказ та обмін між власними рахунками.
3. У **Authentication → URL Configuration** додайте production URL Vercel:
   - Site URL: `https://ваш-домен.vercel.app`
   - Redirect URL: `https://ваш-домен.vercel.app/auth/callback`
4. У Vercel відкрийте **Project Settings → Environment Variables** та додайте:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `CRON_SECRET`
5. Запустіть повторний deployment.

Після появи перших двох змінних демо-вхід автоматично вимикається. Головна
сторінка та всі робочі розділи стають доступними лише після Supabase Auth.

`SUPABASE_SERVICE_ROLE_KEY` не має префікса `NEXT_PUBLIC_` і ніколи не
використовується у браузерному коді.

## Telegram-бот

1. Створіть бота через BotFather та додайте у Vercel `TELEGRAM_BOT_TOKEN`.
2. Створіть випадковий секрет з латинських літер, цифр, `_` або `-` та додайте
   його як `TELEGRAM_WEBHOOK_SECRET`.
3. Зареєструйте webhook запитом до Telegram Bot API:
   `setWebhook` з URL `https://ваш-домен.vercel.app/api/telegram/webhook` та
   параметром `secret_token`, рівним `TELEGRAM_WEBHOOK_SECRET`.
4. Надішліть боту `/start`, скопіюйте отриманий chat ID та збережіть його в
   `notification_preferences.telegram_chat_id` користувача.

Після підключення бот приймає повідомлення `300 кава` або
`1250 квитки #відпустка` і створює витрату в першому активному рахунку.

## Регулярні платежі

`vercel.json` запускає `/api/cron/recurring` щодня о 04:15 UTC. Vercel
автоматично передає `CRON_SECRET` як Bearer-токен. Правила з увімкненим
«Створювати автоматично» створюють транзакцію, змінюють баланс і переносять
дату наступного списання в одній PostgreSQL-операції.

## CSV

Підтримується імпорт до 2 000 рядків за один файл і до 5 МБ. Очікувані колонки:
`Назва, Категорія, Дата, Сума`. Експорт із Finora створює сумісний формат.
