# Підключення Supabase

1. Створіть проєкт у Supabase.
2. Відкрийте **SQL Editor**, вставте вміст
   `supabase/migrations/202607270001_initial_finance_schema.sql` і виконайте запит.
3. У **Authentication → URL Configuration** додайте production URL Vercel:
   - Site URL: `https://ваш-домен.vercel.app`
   - Redirect URL: `https://ваш-домен.vercel.app/auth/callback`
4. У Vercel відкрийте **Project Settings → Environment Variables** та додайте:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
5. Запустіть повторний deployment.

Після появи перших двох змінних демо-вхід автоматично вимикається. Головна
сторінка та всі робочі розділи стають доступними лише після Supabase Auth.

`SUPABASE_SERVICE_ROLE_KEY` не має префікса `NEXT_PUBLIC_` і ніколи не
використовується у браузерному коді.
