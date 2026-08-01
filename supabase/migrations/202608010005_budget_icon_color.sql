-- Лимиты теперь могут иметь собственную иконку и цвет, независимо от категории.
-- Значения по умолчанию гарантируют, что существующие лимиты не сломаются.
alter table public.budgets
  add column if not exists icon text not null default 'CircleDollarSign',
  add column if not exists color text not null default '#6558E8';
