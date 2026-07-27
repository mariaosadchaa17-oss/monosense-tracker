"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, ChevronDown,
  CircleDollarSign, Coffee, CreditCard, Eye, EyeOff, Fingerprint, Home,
  Landmark, Moon, MoreHorizontal, Plus, Search, Settings, ShoppingBag,
  Sparkles, Sun, Target, Utensils, WalletCards, X
} from "lucide-react";

type Transaction = {
  title: string; meta: string; amount: number; icon: "food" | "shop" | "coffee" | "income";
  impulse?: boolean;
};

const initialTransactions: Transaction[] = [
  { title: "Сільпо", meta: "Продукты · 12:42", amount: -1248, icon: "food" },
  { title: "Пополнение", meta: "Доход · Сегодня", amount: 24500, icon: "income" },
  { title: "Zara", meta: "Покупки · Вчера", amount: -2390, icon: "shop", impulse: true },
  { title: "Blur Coffee", meta: "Кафе · Вчера", amount: -185, icon: "coffee" },
];

const budgets = [
  { name: "Продукты", icon: <Utensils size={18}/>, spent: 6840, limit: 10000, color: "#ff6b55" },
  { name: "Транспорт", icon: <ArrowRight size={18}/>, spent: 2260, limit: 4000, color: "#6c63ff" },
  { name: "Развлечения", icon: <Sparkles size={18}/>, spent: 3920, limit: 4500, color: "#f4b740" },
];

function money(value: number) {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(Math.abs(value));
}

function TxIcon({ type }: { type: Transaction["icon"] }) {
  const icons = { food: <Utensils/>, shop: <ShoppingBag/>, coffee: <Coffee/>, income: <ArrowDownLeft/> };
  return <span className={`tx-icon ${type}`}>{icons[type]}</span>;
}

export function FinoraApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState("Главная");
  const [dark, setDark] = useState(false);
  const [modal, setModal] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("finora-theme");
    setDark(stored === "dark");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem("finora-theme", dark ? "dark" : "light");
  }, [dark]);

  const balance = useMemo(() => 124680 + transactions.slice(4).reduce((s, t) => s + t.amount, 0), [transactions]);

  function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!value) return;
    setTransactions([{ title: note || "Новая трата", meta: "Другое · Только что", amount: -value, icon: "shop" }, ...transactions]);
    setAmount(""); setNote(""); setModal(false); setToast("Трата добавлена");
    window.setTimeout(() => setToast(""), 2400);
  }

  if (!loggedIn) return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="brand large"><span className="brand-mark"><CircleDollarSign/></span> finora</div>
        <div className="auth-copy">
          <span className="eyebrow"><Sparkles size={14}/> Деньги без лишней сложности</span>
          <h1>Финансы, которые<br/>наконец-то понятны.</h1>
          <p>Счета, бюджеты и общие цели — в одном спокойном пространстве.</p>
        </div>
        <div className="auth-stat">
          <div><small>Бюджет под контролем</small><strong>82%</strong></div>
          <div className="mini-bars"><i/><i/><i/><i/><i/><i/></div>
        </div>
      </section>
      <section className="auth-form-wrap">
        <button className="theme-btn auth-theme" onClick={() => setDark(!dark)} aria-label="Переключить тему">{dark ? <Sun/> : <Moon/>}</button>
        <form className="auth-card" onSubmit={(e) => { e.preventDefault(); setLoggedIn(true); }}>
          <div className="mobile-logo brand"><span className="brand-mark"><CircleDollarSign/></span> finora</div>
          <div><h2>С возвращением</h2><p>Войдите, чтобы продолжить</p></div>
          <label>Email<input type="email" defaultValue="maria@example.com" required/></label>
          <label>Пароль
            <span className="password-field"><input type={showPassword ? "text" : "password"} defaultValue="finora2026" required/>
              <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/> : <Eye/>}</button>
            </span>
          </label>
          <div className="form-row"><label className="check"><input type="checkbox" defaultChecked/> Запомнить меня</label><button type="button" className="link">Забыли пароль?</button></div>
          <button className="primary" type="submit">Войти <ArrowRight/></button>
          <button className="bio-btn" type="button" onClick={() => setLoggedIn(true)}><Fingerprint/> Войти с Touch ID</button>
          <p className="signup">Нет аккаунта? <button type="button">Создать</button></p>
        </form>
      </section>
    </main>
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><CircleDollarSign/></span> finora</div>
        <nav>
          {[
            ["Главная", <Home key="i"/>], ["Транзакции", <ArrowUpRight key="i"/>],
            ["Бюджет", <BarChart3 key="i"/>], ["Счета", <WalletCards key="i"/>],
            ["Цели", <Target key="i"/>],
          ].map(([label, icon]) => <button key={label as string} className={active === label ? "active" : ""} onClick={() => setActive(label as string)}>{icon}{label}</button>)}
        </nav>
        <div className="side-bottom">
          <button><Settings/> Настройки</button>
          <div className="profile"><span>МК</span><div><strong>Мария</strong><small>maria@example.com</small></div><MoreHorizontal/></div>
        </div>
      </aside>

      <section className="content">
        <header>
          <div><p className="hello">Доброе утро, Мария <span>☀</span></p><h1>Ваши финансы</h1></div>
          <div className="header-actions">
            <button className="theme-btn" onClick={() => setDark(!dark)}>{dark ? <Sun/> : <Moon/>}</button>
            <button className="theme-btn notification"><Bell/><i/></button>
            <button className="add-btn" onClick={() => setModal(true)}><Plus/> Добавить трату</button>
          </div>
        </header>

        <div className="summary-grid">
          <article className="balance-card">
            <div className="card-top"><span>Общий баланс</span><button>UAH <ChevronDown/></button></div>
            <h2>₴ {money(balance)}<small>.00</small></h2>
            <div className="balance-meta"><span><ArrowUpRight/> +₴ 24 500 <small>доходы</small></span><span><ArrowDownLeft/> −₴ 16 320 <small>расходы</small></span></div>
            <div className="balance-footer"><span>За июль</span><span className="positive">+8.4% к июню</span></div>
          </article>
          <article className="forecast-card">
            <div className="card-heading"><div><span>Прогноз на конец месяца</span><h3>₴ 108 360</h3></div><span className="forecast-icon"><Sparkles/></span></div>
            <div className="forecast-line"><i style={{width:"66%"}}/><b/></div>
            <p>При текущем темпе трат</p>
            <div className="insight"><Sparkles/> Вы тратите на 12% меньше, чем в июне</div>
          </article>
        </div>

        <section className="accounts">
          <div className="section-title"><div><h2>Мои счета</h2><p>Баланс по всем активам</p></div><button>Все счета <ArrowRight/></button></div>
          <div className="account-row">
            <article className="account mono"><div><span className="bank-icon">M</span><MoreHorizontal/></div><p>Черная mono</p><h3>₴ 48 240</h3><small>•• 4582 · Мой</small></article>
            <article className="account privat"><div><span className="bank-icon">P</span><MoreHorizontal/></div><p>Белая Privat</p><h3>₴ 32 180</h3><small>•• 9014 · Мой</small></article>
            <article className="account stash"><div><span className="bank-icon"><Landmark/></span><MoreHorizontal/></div><p>Заначка</p><h3>$ 1 080</h3><small>≈ ₴ 44 260 · Общий</small></article>
            <button className="new-account"><Plus/><span>Добавить счет</span></button>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel transactions">
            <div className="section-title"><div><h2>Последние операции</h2><p>Сегодня и вчера</p></div><button>Все операции <ArrowRight/></button></div>
            <div className="tx-list">
              {transactions.slice(0,4).map((tx, i) => <div className="tx" key={`${tx.title}-${i}`}>
                <TxIcon type={tx.icon}/><div className="tx-info"><strong>{tx.title}{tx.impulse && <em>Импульсивная</em>}</strong><small>{tx.meta}</small></div>
                <strong className={tx.amount > 0 ? "income-amount" : ""}>{tx.amount > 0 ? "+" : "−"} ₴ {money(tx.amount)}</strong>
              </div>)}
            </div>
          </section>
          <section className="panel budget-panel">
            <div className="section-title"><div><h2>Бюджет июля</h2><p>13 дней до конца месяца</p></div><button><MoreHorizontal/></button></div>
            <div className="budget-total"><div><small>Потрачено</small><strong>₴ 16 320 <span>из ₴ 27 500</span></strong></div><b>59%</b></div>
            <div className="main-progress"><i/></div>
            <div className="budget-list">{budgets.map(b => <div className="budget-item" key={b.name}>
              <span className="budget-icon" style={{color:b.color, background:`${b.color}15`}}>{b.icon}</span>
              <div><div><strong>{b.name}</strong><small>₴ {money(b.spent)} / {money(b.limit)}</small></div><span><i style={{width:`${b.spent / b.limit * 100}%`, background:b.color}}/></span></div>
            </div>)}</div>
          </section>
        </div>

        <nav className="mobile-nav">
          {[["Главная",<Home key="h"/>],["Операции",<ArrowUpRight key="t"/>],["Добавить",<Plus key="p"/>],["Бюджет",<BarChart3 key="b"/>],["Ещё",<MoreHorizontal key="m"/>]].map(([l,i],idx)=>
            <button key={l as string} className={idx===0?"active":idx===2?"central":""} onClick={()=>idx===2&&setModal(true)}>{i}<small>{l}</small></button>)}
        </nav>
      </section>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}>
        <form className="expense-modal" onSubmit={addExpense} onMouseDown={e => e.stopPropagation()}>
          <div className="modal-head"><div><span className="eyebrow">Быстрый ввод</span><h2>Новая трата</h2></div><button type="button" onClick={() => setModal(false)}><X/></button></div>
          <label className="amount-field"><span>₴</span><input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}/></label>
          <label>Заметка<input placeholder="Например, кофе" value={note} onChange={e => setNote(e.target.value)}/></label>
          <div className="modal-selects"><button type="button"><CreditCard/> Черная mono <ChevronDown/></button><button type="button"><ShoppingBag/> Покупки <ChevronDown/></button></div>
          <label className="check impulse"><input type="checkbox"/> Импульсивная трата</label>
          <button className="primary" type="submit">Добавить трату</button>
        </form>
      </div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
