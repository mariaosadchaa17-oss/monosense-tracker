# Підключення Supabase

1. Створіть проєкт у Supabase.
2. Відкрийте **SQL Editor** і послідовно виконайте:
   - `supabase/migrations/202607270001_initial_finance_schema.sql`;
   - `supabase/migrations/202607270002_atomic_finance_operations.sql`.
   - `supabase/migrations/202607270003_goals_and_recurring.sql`.
   - `supabase/migrations/202607270004_push_notifications.sql`.
   - `supabase/migrations/202607270005_passkeys.sql`.
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
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` — наприклад `mailto:you@example.com`
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

## Push-сповіщення

Згенеруйте одну пару VAPID-ключів командою `web-push generate-vapid-keys` і
збережіть її у Vercel. Приватний ключ не можна додавати до `NEXT_PUBLIC_*`.
Користувач вмикає push самостійно у налаштуваннях Finora. Cron перевіряє
бюджети кожні три години та надсилає алерти один раз на порогах 80% і 100%.

## Face ID, Touch ID та PIN пристрою

Після входу користувач додає passkey у налаштуваннях. WebAuthn зберігає
приватний ключ у Secure Enclave, TPM або менеджері паролів пристрою; база
отримує лише публічний ключ. Наступний вхід можна підтвердити Face ID,
Touch ID, Windows Hello або системним PIN-кодом. `NEXT_PUBLIC_APP_URL`
обов’язково має точно відповідати production-домену, оскільки passkey
прив’язаний до домену.

## CSV

Підтримується імпорт до 2 000 рядків за один файл і до 5 МБ. Очікувані колонки:
`Назва, Категорія, Дата, Сума`. Експорт із Finora створює сумісний формат.
