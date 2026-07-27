"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarDays,
  ChevronDown, CircleDollarSign, Coffee, CreditCard, Download, Eye, EyeOff,
  Fingerprint, Goal, Home, Landmark, Moon, MoreHorizontal, PiggyBank, Plus,
  Search, Settings, ShoppingBag, Sparkles, Sun, Target, Tags, Trash2,
  TrendingUp, Upload, Utensils, WalletCards, X
} from "lucide-react";

type Page = "Головна" | "Операції" | "Бюджет" | "Рахунки" | "Цілі" | "Налаштування";
type Transaction = { id: number; title: string; category: string; date: string; amount: number; impulse?: boolean };
type Account = { id: number; name: string; bank: string; owner: string; currency: string; balance: number; style: string };

const seedTransactions: Transaction[] = [
  { id: 1, title: "Сільпо", category: "Продукти", date: "Сьогодні, 12:42", amount: -1248 },
  { id: 2, title: "Поповнення", category: "Дохід", date: "Сьогодні, 09:10", amount: 24500 },
  { id: 3, title: "Zara", category: "Покупки", date: "Учора, 18:30", amount: -2390, impulse: true },
  { id: 4, title: "Blur Coffee", category: "Кафе", date: "Учора, 10:15", amount: -185 },
];
const seedAccounts: Account[] = [
  { id: 1, name: "Чорна mono", bank: "monobank", owner: "Мій", currency: "UAH", balance: 48240, style: "mono" },
  { id: 2, name: "Біла Privat", bank: "ПриватБанк", owner: "Мій", currency: "UAH", balance: 32180, style: "privat" },
  { id: 3, name: "Заначка", bank: "Готівка", owner: "Спільний", currency: "USD", balance: 1080, style: "stash" },
];
const budgetRows = [
  { name: "Продукти", spent: 6840, limit: 10000, color: "#ff6b55" },
  { name: "Транспорт", spent: 2260, limit: 4000, color: "#6c63ff" },
  { name: "Розваги", spent: 3920, limit: 4500, color: "#f4b740" },
  { name: "Здоров’я", spent: 1180, limit: 3000, color: "#19a974" },
];

const formatMoney = (value: number) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(Math.abs(value));

export function FinoraApp({ initialLoggedIn = false }: { initialLoggedIn?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage] = useState<Page>("Головна");
  const [dark, setDark] = useState(false);
  const [modal, setModal] = useState<"expense" | "account" | null>(null);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [accounts, setAccounts] = useState(seedAccounts);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setDark(localStorage.getItem("finora-theme") === "dark");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("finora-theme", dark ? "dark" : "light");
  }, [dark]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  const balance = useMemo(() => accounts.reduce((sum, a) => sum + (a.currency === "USD" ? a.balance * 41 : a.balance), 0), [accounts]);
  const filteredTransactions = transactions.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!value) return;
    setTransactions([{ id: Date.now(), title: note || "Нова витрата", category: "Інше", date: "Щойно", amount: -value }, ...transactions]);
    setAmount(""); setNote(""); setModal(null); notify("Витрату додано");
  }
  function addAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setAccounts([...accounts, {
      id: Date.now(), name: String(form.get("name") || "Новий рахунок"), bank: String(form.get("bank") || "Інший"),
      owner: String(form.get("owner") || "Мій"), currency: String(form.get("currency") || "UAH"),
      balance: Number(form.get("balance")) || 0, style: "stash",
    }]);
    setModal(null); notify("Рахунок створено");
  }

  if (!loggedIn) return <Login dark={dark} setDark={setDark} showPassword={showPassword} setShowPassword={setShowPassword} login={() => setLoggedIn(true)}/>;

  const nav: [Page, React.ReactNode][] = [
    ["Головна", <Home key="h"/>], ["Операції", <ArrowUpRight key="o"/>], ["Бюджет", <BarChart3 key="b"/>],
    ["Рахунки", <WalletCards key="r"/>], ["Цілі", <Target key="c"/>],
  ];

  return <main className="app-shell">
    <aside className="sidebar">
      <button className="brand brand-button" onClick={() => setPage("Головна")}><span className="brand-mark"><CircleDollarSign/></span> finora</button>
      <nav>{nav.map(([label, icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => setPage(label)}>{icon}{label}</button>)}</nav>
      <div className="side-bottom">
        <button className={page === "Налаштування" ? "active" : ""} onClick={() => setPage("Налаштування")}><Settings/> Налаштування</button>
        <button className="profile" onClick={() => setPage("Налаштування")}><span>МО</span><div><strong>Марія</strong><small>maria@example.com</small></div><MoreHorizontal/></button>
      </div>
    </aside>

    <section className="content">
      <header>
        <div><p className="hello">Вітаємо, Маріє <span>☀</span></p><h1>{page === "Головна" ? "Ваші фінанси" : page}</h1></div>
        <div className="header-actions">
          <button className="theme-btn" onClick={() => setDark(!dark)} aria-label="Змінити тему">{dark ? <Sun/> : <Moon/>}</button>
          <button className="theme-btn notification" onClick={() => notify("Нових сповіщень немає")} aria-label="Сповіщення"><Bell/><i/></button>
          <button className="add-btn" onClick={() => setModal("expense")}><Plus/> Додати витрату</button>
        </div>
      </header>

      {page === "Головна" && <Dashboard balance={balance} accounts={accounts} transactions={transactions} openPage={setPage} addAccount={() => setModal("account")}/>}
      {page === "Операції" && <TransactionsView transactions={filteredTransactions} search={search} setSearch={setSearch} remove={id => { setTransactions(transactions.filter(t => t.id !== id)); notify("Операцію видалено"); }} exportCsv={() => exportCsv(transactions, notify)}/>}
      {page === "Бюджет" && <BudgetView notify={notify}/>}
      {page === "Рахунки" && <AccountsView accounts={accounts} add={() => setModal("account")} remove={id => { setAccounts(accounts.filter(a => a.id !== id)); notify("Рахунок видалено"); }}/>}
      {page === "Цілі" && <GoalsView notify={notify}/>}
      {page === "Налаштування" && <SettingsView dark={dark} setDark={setDark} logout={async () => {
        if (initialLoggedIn) {
          await fetch("/auth/signout", { method: "POST" });
          window.location.href = "/auth";
        } else setLoggedIn(false);
      }} notify={notify}/>}

      <nav className="mobile-nav">
        <button className={page === "Головна" ? "active" : ""} onClick={() => setPage("Головна")}><Home/><small>Головна</small></button>
        <button className={page === "Операції" ? "active" : ""} onClick={() => setPage("Операції")}><ArrowUpRight/><small>Операції</small></button>
        <button className="central" onClick={() => setModal("expense")}><Plus/><small>Додати</small></button>
        <button className={page === "Бюджет" ? "active" : ""} onClick={() => setPage("Бюджет")}><BarChart3/><small>Бюджет</small></button>
        <button className={page === "Налаштування" ? "active" : ""} onClick={() => setPage("Налаштування")}><MoreHorizontal/><small>Ще</small></button>
      </nav>
    </section>

    {modal === "expense" && <ExpenseModal amount={amount} setAmount={setAmount} note={note} setNote={setNote} submit={addExpense} close={() => setModal(null)}/>}
    {modal === "account" && <AccountModal submit={addAccount} close={() => setModal(null)}/>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function Login({ dark, setDark, showPassword, setShowPassword, login }: {dark:boolean;setDark:(v:boolean)=>void;showPassword:boolean;setShowPassword:(v:boolean)=>void;login:()=>void}) {
  return <main className="auth-shell">
    <section className="auth-brand"><div className="brand large"><span className="brand-mark"><CircleDollarSign/></span> finora</div>
      <div className="auth-copy"><span className="eyebrow"><Sparkles size={14}/> Гроші без зайвої складності</span><h1>Фінанси, які<br/>нарешті зрозумілі.</h1><p>Рахунки, бюджети та спільні цілі — в одному спокійному просторі.</p></div>
      <div className="auth-stat"><div><small>Бюджет під контролем</small><strong>82%</strong></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/></div></div>
    </section>
    <section className="auth-form-wrap"><button className="theme-btn auth-theme" onClick={() => setDark(!dark)}>{dark ? <Sun/> : <Moon/>}</button>
      <form className="auth-card" onSubmit={e => {e.preventDefault();login();}}><div className="mobile-logo brand"><span className="brand-mark"><CircleDollarSign/></span> finora</div>
        <div><h2>З поверненням</h2><p>Увійдіть, щоб продовжити</p></div>
        <label>Email<input type="email" defaultValue="maria@example.com" required/></label>
        <label>Пароль<span className="password-field"><input type={showPassword ? "text" : "password"} defaultValue="finora2026" required/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/> : <Eye/>}</button></span></label>
        <div className="form-row"><label className="check"><input type="checkbox" defaultChecked/> Запам’ятати мене</label><button type="button" className="link">Забули пароль?</button></div>
        <button className="primary" type="submit">Увійти <ArrowRight/></button><button className="bio-btn" type="button" onClick={login}><Fingerprint/> Увійти з Touch ID</button>
        <p className="signup">Немає акаунта? <button type="button">Створити</button></p>
      </form>
    </section>
  </main>;
}

function Dashboard({ balance, accounts, transactions, openPage, addAccount }: {balance:number;accounts:Account[];transactions:Transaction[];openPage:(p:Page)=>void;addAccount:()=>void}) {
  return <><div className="summary-grid"><article className="balance-card"><div className="card-top"><span>Загальний баланс</span><button>UAH <ChevronDown/></button></div><h2>₴ {formatMoney(balance)}<small>.00</small></h2><div className="balance-meta"><span><ArrowUpRight/> +₴ 24 500 <small>доходи</small></span><span><ArrowDownLeft/> −₴ 16 320 <small>витрати</small></span></div><div className="balance-footer"><span>За липень</span><span className="positive">+8.4% до червня</span></div></article>
    <article className="forecast-card"><div className="card-heading"><div><span>Прогноз на кінець місяця</span><h3>₴ 108 360</h3></div><span className="forecast-icon"><Sparkles/></span></div><div className="forecast-line"><i style={{width:"66%"}}/><b/></div><p>За поточного темпу витрат</p><div className="insight"><Sparkles/> Ви витрачаєте на 12% менше, ніж у червні</div></article></div>
    <section className="accounts"><div className="section-title"><div><h2>Мої рахунки</h2><p>Баланс усіх активів</p></div><button onClick={() => openPage("Рахунки")}>Усі рахунки <ArrowRight/></button></div><div className="account-row">{accounts.slice(0,3).map(a => <AccountCard key={a.id} account={a}/>) }<button className="new-account" onClick={addAccount}><Plus/><span>Додати рахунок</span></button></div></section>
    <div className="dashboard-grid"><section className="panel transactions"><div className="section-title"><div><h2>Останні операції</h2><p>Сьогодні та вчора</p></div><button onClick={() => openPage("Операції")}>Усі операції <ArrowRight/></button></div><TransactionList transactions={transactions.slice(0,4)}/></section><section className="panel budget-panel"><div className="section-title"><div><h2>Бюджет липня</h2><p>13 днів до кінця місяця</p></div><button onClick={() => openPage("Бюджет")}><MoreHorizontal/></button></div><div className="budget-total"><div><small>Витрачено</small><strong>₴ 16 320 <span>з ₴ 27 500</span></strong></div><b>59%</b></div><div className="main-progress"><i/></div><BudgetRows rows={budgetRows.slice(0,3)}/></section></div></>;
}

function TransactionsView({ transactions, search, setSearch, remove, exportCsv }: {transactions:Transaction[];search:string;setSearch:(s:string)=>void;remove:(id:number)=>void;exportCsv:()=>void}) {
  return <section className="panel full-view"><div className="view-toolbar"><label className="search-box"><Search/><input placeholder="Пошук за назвою або категорією" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="secondary"><Tags/> Фільтри</button><button className="secondary" onClick={exportCsv}><Download/> CSV</button></div><div className="data-head"><span>Операція</span><span>Категорія</span><span>Дата</span><span>Сума</span><span/></div>{transactions.map(t=><div className="data-row" key={t.id}><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}</strong><span>{t.category}</span><span>{t.date}</span><b className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} ₴ {formatMoney(t.amount)}</b><button className="icon-button danger" onClick={()=>remove(t.id)}><Trash2/></button></div>)}{transactions.length===0&&<div className="empty">Нічого не знайдено</div>}</section>;
}
function BudgetView({notify}:{notify:(s:string)=>void}) { return <><div className="metric-grid"><article className="metric"><small>Місячний план</small><strong>₴ 27 500</strong><span>59% використано</span></article><article className="metric"><small>Прогноз залишку</small><strong>₴ 11 180</strong><span className="positive">Краще плану на 12%</span></article><article className="metric"><small>Імпульсивні витрати</small><strong>₴ 2 390</strong><span>14.6% усіх витрат</span></article></div><section className="panel full-view"><div className="section-title"><div><h2>Ліміти за категоріями</h2><p>Липень 2026</p></div><button className="small-primary" onClick={()=>notify("Редактор лімітів буде додано наступним кроком")}><Plus/> Додати ліміт</button></div><div className="large-budget"><BudgetRows rows={budgetRows}/></div><div className="alert-card"><Bell/><div><strong>Наближення до ліміту</strong><p>Категорія «Розваги» використана на 87%. Залишилося ₴ 580.</p></div></div></section></>; }
function AccountsView({accounts,add,remove}:{accounts:Account[];add:()=>void;remove:(id:number)=>void}) { return <section className="panel full-view"><div className="section-title"><div><h2>Усі рахунки</h2><p>UAH, USD та інші валюти</p></div><button className="small-primary" onClick={add}><Plus/> Новий рахунок</button></div><div className="accounts-grid">{accounts.map(a=><div className="account-wrap" key={a.id}><AccountCard account={a}/><button className="remove-account" onClick={()=>remove(a.id)}><Trash2/> Видалити</button></div>)}</div><div className="rate-card"><Landmark/><div><strong>Курс НБУ</strong><p>USD 41.00 · EUR 47.85</p></div><span>Оновлено сьогодні</span></div></section>; }
function GoalsView({notify}:{notify:(s:string)=>void}) { const goals=[["Резервний фонд",120000,200000,"#6c5ce7"],["Подорож до Японії",38500,150000,"#19a974"],["Новий ноутбук",42000,70000,"#f4b740"]]; return <section className="panel full-view"><div className="section-title"><div><h2>Фінансові цілі</h2><p>Накопичення та великі покупки</p></div><button className="small-primary" onClick={()=>notify("Нову ціль буде додано в наступному оновленні")}><Plus/> Нова ціль</button></div><div className="goals-grid">{goals.map(g=><article className="goal-card" key={g[0]}><span className="goal-icon"><PiggyBank/></span><small>Ціль</small><h3>{g[0]}</h3><strong>₴ {formatMoney(Number(g[1]))} <span>з ₴ {formatMoney(Number(g[2]))}</span></strong><div><i style={{width:`${Number(g[1])/Number(g[2])*100}%`,background:String(g[3])}}/></div><p>{Math.round(Number(g[1])/Number(g[2])*100)}% накопичено</p><button onClick={()=>notify(`Поповнення цілі «${g[0]}»`)}>Поповнити</button></article>)}</div></section>; }
function SettingsView({dark,setDark,logout,notify}:{dark:boolean;setDark:(v:boolean)=>void;logout:()=>void;notify:(s:string)=>void}) { return <div className="settings-grid"><section className="panel settings-card"><h2>Загальні</h2><label>Базова валюта<select defaultValue="UAH"><option>UAH — гривня</option><option>USD — долар</option><option>EUR — євро</option></select></label><label>Власник за замовчуванням<input defaultValue="Мій"/></label><label className="setting-toggle"><span><strong>Темна тема</strong><small>Змінити вигляд застосунку</small></span><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/></label><button className="primary" onClick={()=>notify("Налаштування збережено")}>Зберегти</button></section><section className="panel settings-card"><h2>Дані та інтеграції</h2><button className="integration" onClick={()=>notify("Імпорт CSV буде додано наступним кроком")}><Upload/><span><strong>Імпорт даних</strong><small>CSV або Excel</small></span><ArrowRight/></button><button className="integration" onClick={()=>notify("Telegram API очікує токен бота")}><Goal/><span><strong>Telegram-бот</strong><small>Швидке додавання витрат</small></span><ArrowRight/></button><button className="logout" onClick={logout}>Вийти з акаунта</button></section></div>; }

function AccountCard({account}:{account:Account}) { return <article className={`account ${account.style}`}><div><span className="bank-icon">{account.bank==="Готівка"?<Landmark/>:account.bank[0].toUpperCase()}</span><MoreHorizontal/></div><p>{account.name}</p><h3>{account.currency==="UAH"?"₴":"$"} {formatMoney(account.balance)}</h3><small>{account.bank} · {account.owner}</small></article>; }
function TransactionList({transactions}:{transactions:Transaction[]}) { return <div className="tx-list">{transactions.map(t=><div className="tx" key={t.id}><span className={`tx-icon ${t.amount>0?"income":"shop"}`}>{t.amount>0?<ArrowDownLeft/>:<ShoppingBag/>}</span><div className="tx-info"><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}</strong><small>{t.category} · {t.date}</small></div><strong className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} ₴ {formatMoney(t.amount)}</strong></div>)}</div>; }
function BudgetRows({rows}:{rows:typeof budgetRows}) { return <div className="budget-list">{rows.map(b=><div className="budget-item" key={b.name}><span className="budget-icon" style={{color:b.color,background:`${b.color}15`}}><Utensils/></span><div><div><strong>{b.name}</strong><small>₴ {formatMoney(b.spent)} / {formatMoney(b.limit)}</small></div><span><i style={{width:`${b.spent/b.limit*100}%`,background:b.color}}/></span></div></div>)}</div>; }
function ExpenseModal({amount,setAmount,note,setNote,submit,close}:{amount:string;setAmount:(s:string)=>void;note:string;setNote:(s:string)=>void;submit:(e:React.FormEvent)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Швидке введення" title="Нова витрата" close={close}/><label className="amount-field"><span>₴</span><input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Нотатка<input placeholder="Наприклад, кава" value={note} onChange={e=>setNote(e.target.value)}/></label><div className="modal-selects"><button type="button"><CreditCard/> Чорна mono <ChevronDown/></button><button type="button"><ShoppingBag/> Покупки <ChevronDown/></button></div><label className="check impulse"><input type="checkbox"/> Імпульсивна витрата</label><button className="primary">Додати витрату</button></form></div>; }
function AccountModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Новий актив" title="Додати рахунок" close={close}/><label>Назва<input name="name" placeholder="Наприклад, Зарплатна картка" required/></label><div className="form-two"><label>Банк<input name="bank" placeholder="monobank"/></label><label>Власник<input name="owner" placeholder="Мій"/></label></div><div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Баланс<input name="balance" type="number" placeholder="0"/></label></div><button className="primary">Створити рахунок</button></form></div>; }
function ModalHead({label,title,close}:{label:string;title:string;close:()=>void}) { return <div className="modal-head"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><button type="button" onClick={close}><X/></button></div>; }
function exportCsv(items:Transaction[],notify:(s:string)=>void) { const csv=["Назва,Категорія,Дата,Сума",...items.map(t=>`"${t.title}","${t.category}","${t.date}",${t.amount}`)].join("\n"); const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download="finora-transactions.csv";a.click();URL.revokeObjectURL(url);notify("CSV-файл завантажено"); }
