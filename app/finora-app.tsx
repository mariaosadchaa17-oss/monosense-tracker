"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarDays,
  ChevronDown, CircleDollarSign, Coffee, CreditCard, Download, Eye, EyeOff,
  Fingerprint, Goal, Home, Landmark, Moon, MoreHorizontal, PiggyBank, Plus,
  Search, Settings, ShoppingBag, Sparkles, Sun, Target, Tags, Trash2,
  TrendingUp, Upload, Utensils, WalletCards, X, PieChart, HandCoins, Repeat2
} from "lucide-react";
import {PasskeyButton} from "./components/passkey-button";

type Page = "Головна" | "Операції" | "Бюджет" | "Рахунки" | "Цілі" | "Аналітика" | "Борги" | "Налаштування";
type Transaction = { id: number | string; title: string; category: string; date: string; bookedAt?:string; account?:string; owner?:string; tags?:string[]; amount: number; impulse?: boolean };
type Account = { id: number | string; name: string; bank: string; owner: string; currency: string; balance: number; style: string;creditLimit?:number;graceEnd?:string };
type GoalItem = {id:string;name:string;target:number;current:number;currency:string;date?:string;color:string};
type DebtItem = {id:string;person:string;direction:"owed_to_me"|"i_owe";amount:number;currency:string;due?:string;note?:string};
type RecurringItem = {id:string;name:string;amount:number;currency:string;frequency:string;next:string;auto:boolean};
type CategoryItem = {id:string;name:string;kind:string;color:string};
type BudgetItem = {id:string;categoryId:string;name:string;limit:number;currency:string;month:string;color:string};
type AuditItem = {id:string;entity:string;action:string;created:string;actor?:string};

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
  const [modal, setModal] = useState<"expense" | "account" | "goal" | "debt" | "recurring" | "transfer" | "budget" | "category" | "invite" | null>(null);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [accounts, setAccounts] = useState(seedAccounts);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [rates, setRates] = useState<{currency:string;rate:number;date:string}[]>([]);
  const [syncing, setSyncing] = useState(initialLoggedIn);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [savedBudgets, setSavedBudgets] = useState<BudgetItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
  const [pushEnabled,setPushEnabled]=useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("finora-theme") === "dark");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onInstall=(event:Event)=>{event.preventDefault();setInstallPrompt(event)};
    window.addEventListener("beforeinstallprompt",onInstall);
    const params=new URLSearchParams(location.search);
    if(params.get("action")==="expense")setModal("expense");
    if(params.get("section")==="budget")setPage("Бюджет");
    if("Notification" in window)setPushEnabled(Notification.permission==="granted");
    return()=>window.removeEventListener("beforeinstallprompt",onInstall);
  }, []);
  async function refreshFinance() {
    if (!initialLoggedIn) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/finance", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAccounts((data.accounts || []).map((item: Record<string, unknown>, index: number) => ({
        id: String(item.id), name: String(item.name), bank: String(item.bank || "Інший"),
        owner: String(item.owner_label || "Мій"), currency: String(item.currency),
        balance: Number(item.balance), style: index % 3 === 0 ? "mono" : index % 3 === 1 ? "privat" : "stash",
        creditLimit:Number(item.credit_limit)||0,graceEnd:item.grace_period_end?String(item.grace_period_end):undefined,
      })));
      setTransactions((data.transactions || []).map((item: Record<string, unknown>) => ({
        id: String(item.id), title: String(item.note || (item.type === "income" ? "Дохід" : "Витрата")),
        category: String((item.categories as {name?:string}|null)?.name || "Без категорії"),
        date: new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(item.booked_at))),
        bookedAt:String(item.booked_at),account:String((item.accounts as {name?:string}|null)?.name||""),
        owner:String((item.accounts as {owner_label?:string}|null)?.owner_label||""),
        tags:((item.transaction_tags as {tags?:{name?:string}|null}[]|null)||[]).map(link=>String(link.tags?.name||"")).filter(Boolean),
        amount: Number(item.amount) * (item.type === "income" ? 1 : -1), impulse: Boolean(item.is_impulsive),
      })));
      setGoals((data.goals||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),target:Number(item.target_amount),current:Number(item.current_amount),currency:String(item.currency),date:item.target_date?String(item.target_date):undefined,color:String(item.color||"#6558E8")})));
      setDebts((data.debts||[]).map((item:Record<string,unknown>)=>({id:String(item.id),person:String(item.person),direction:item.direction==="i_owe"?"i_owe":"owed_to_me",amount:Number(item.amount),currency:String(item.currency),due:item.due_date?String(item.due_date):undefined,note:String(item.note||"")})));
      setRecurring((data.recurring||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),amount:Number(item.amount),currency:String(item.currency),frequency:String(item.frequency),next:String(item.next_run_at),auto:Boolean(item.auto_create)})));
      setCategories((data.categories||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),kind:String(item.kind),color:String(item.color||"#6558E8")})));
      setSavedBudgets((data.budgets||[]).map((item:Record<string,unknown>)=>({id:String(item.id),categoryId:String(item.category_id),name:String((item.categories as {name?:string}|null)?.name||"Категорія"),limit:Number(item.limit_amount),currency:String(item.currency),month:String(item.month),color:String((item.categories as {color?:string}|null)?.color||"#6558E8")})));
      setAudit((data.audit||[]).map((item:Record<string,unknown>)=>({id:String(item.id),entity:String(item.entity_type),action:String(item.action),created:String(item.created_at),actor:item.actor_id?String(item.actor_id):undefined})));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Помилка синхронізації");
    } finally { setSyncing(false); }
  }
  useEffect(() => { void refreshFinance(); }, [initialLoggedIn]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("finora-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    fetch("/api/exchange-rates").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.rates) setRates(data.rates);
    }).catch(() => {});
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  const balance = useMemo(() => accounts.reduce((sum, a) => sum + (a.currency === "USD" ? a.balance * 41 : a.balance), 0), [accounts]);
  const filteredTransactions = transactions.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const value = Number(amount.replace(",", "."));
    if (!value) return;
    if (initialLoggedIn) {
      const account = accounts.find(a=>String(a.id)===String(form.get("account")))||accounts[0];
      if (!account) return notify("Спочатку створіть рахунок");
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        action:"createTransaction", accountId:account.id, categoryId:form.get("category")||null, amount:value, currency:account.currency, note, type:"expense",
        isImpulsive:form.get("impulse")==="on",splitTotal:form.get("splitTotal")||null,personalShare:form.get("personalShare")||null,
        bookedAt:form.get("date")?new Date(String(form.get("date"))).toISOString():undefined,
        tags:String(form.get("tags")||"").split(/\s+/).filter(Boolean),
      })});
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося додати витрату");
      setAmount(""); setNote(""); setModal(null); notify("Витрату збережено");
      await refreshFinance(); return;
    }
    setTransactions([{ id: Date.now(), title: note || "Нова витрата", category: categories.find(c=>c.id===form.get("category"))?.name||"Інше", date: "Щойно", amount: -value,impulse:form.get("impulse")==="on" }, ...transactions]);
    setAmount(""); setNote(""); setModal(null); notify("Витрату додано");
  }
  async function addAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (initialLoggedIn) {
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        action:"createAccount", name:form.get("name"), bank:form.get("bank"), owner:form.get("owner"),
        currency:form.get("currency"), balance:form.get("balance"),
        creditLimit:form.get("creditLimit"),graceEnd:form.get("graceEnd"),
      })});
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося створити рахунок");
      setModal(null); notify("Рахунок збережено"); await refreshFinance(); return;
    }
    setAccounts([...accounts, {
      id: Date.now(), name: String(form.get("name") || "Новий рахунок"), bank: String(form.get("bank") || "Інший"),
      owner: String(form.get("owner") || "Мій"), currency: String(form.get("currency") || "UAH"),
      balance: Number(form.get("balance")) || 0, style: "stash",
    }]);
    setModal(null); notify("Рахунок створено");
  }
  async function removeAccount(id: number|string) {
    if (initialLoggedIn) {
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"deleteAccount",id})});
      const result = await response.json(); if(!response.ok)return notify(result.error||"Помилка видалення");
      await refreshFinance();
    } else setAccounts(accounts.filter(a => a.id !== id));
    notify("Рахунок видалено");
  }
  async function removeTransaction(id: number|string) {
    if (initialLoggedIn) {
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"deleteTransaction",id})});
      const result = await response.json(); if(!response.ok)return notify(result.error||"Помилка видалення");
      await refreshFinance();
    } else setTransactions(transactions.filter(t => t.id !== id));
    notify("Операцію видалено");
  }
  async function financeAction(payload:Record<string,unknown>, success:string) {
    if (!initialLoggedIn) { notify("Функція активується після підключення Supabase"); return false; }
    const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json(); if(!response.ok){notify(result.error||"Помилка збереження");return false;}
    notify(success);await refreshFinance();return true;
  }
  async function addGoal(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createGoal",name:f.get("name"),targetAmount:f.get("target"),currentAmount:f.get("current"),currency:f.get("currency"),targetDate:f.get("date")},"Ціль створено"))setModal(null);}
  async function addDebt(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createDebt",person:f.get("person"),direction:f.get("direction"),amount:f.get("amount"),currency:f.get("currency"),dueDate:f.get("date"),note:f.get("note")},"Борг додано"))setModal(null);}
  async function addRecurring(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const account=accounts[0];if(!account)return notify("Спочатку створіть рахунок");if(await financeAction({action:"createRecurring",accountId:account.id,name:f.get("name"),amount:f.get("amount"),currency:account.currency,frequency:f.get("frequency"),nextRunAt:f.get("date"),autoCreate:f.get("auto")==="on"},"Регулярний платіж створено"))setModal(null);}
  async function addTransfer(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createTransfer",fromAccountId:f.get("from"),toAccountId:f.get("to"),sentAmount:f.get("sent"),receivedAmount:f.get("received"),exchangeRate:f.get("rate"),feeAmount:f.get("fee"),feeCurrency:f.get("feeCurrency"),note:f.get("note")},"Переказ виконано"))setModal(null);}
  async function addBudget(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createBudget",categoryId:f.get("category"),month:`${f.get("month")}-01`,limitAmount:f.get("limit"),currency:"UAH"},"Ліміт збережено"))setModal(null);}
  async function addCategory(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createCategory",name:f.get("name"),kind:f.get("kind"),icon:f.get("icon"),color:f.get("color")},"Категорію створено"))setModal(null);}
  async function createInvite(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const response=await fetch("/api/household/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:f.get("email"),role:f.get("role")})});const result=await response.json();if(!response.ok)return notify(result.error||"Не вдалося створити запрошення");await navigator.clipboard.writeText(result.url);setModal(null);notify("Посилання запрошення скопійовано");}
  async function enablePush(){
    if(!initialLoggedIn)return notify("Сповіщення активуються після підключення Supabase");
    if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))return notify("Цей браузер не підтримує push");
    const permission=await Notification.requestPermission();if(permission!=="granted")return notify("Дозвіл на сповіщення не надано");
    const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;if(!key)return notify("VAPID-ключ не налаштовано");
    const registration=await navigator.serviceWorker.ready;
    const padding="=".repeat((4-key.length%4)%4);const raw=atob((key+padding).replace(/-/g,"+").replace(/_/g,"/"));const applicationServerKey=Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
    const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
    const response=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(subscription)});
    if(!response.ok)return notify("Не вдалося зберегти push-підписку");setPushEnabled(true);notify("Push-сповіщення увімкнено");
  }
  async function installApp(){if(!installPrompt)return notify("Відкрийте меню браузера та оберіть «Додати на головний екран»");await (installPrompt as Event&{prompt:()=>Promise<void>}).prompt();setInstallPrompt(null);}
  async function importCsv(file: File) {
    const text = await file.text();
    if (initialLoggedIn) {
      const response = await fetch("/api/import/csv", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
      const result = await response.json();
      notify(response.ok ? `Імпортовано операцій: ${result.imported}` : result.error || "Помилка імпорту");
      return;
    }
    const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).filter(Boolean);
    const imported = rows.map((line, index) => {
      const cells = line.split(",").map(v => v.replace(/^"|"$/g, ""));
      const value = Number((cells[3] || "0").replace(",", "."));
      return { id: Date.now() + index, title: cells[0] || "Імпорт", category: cells[1] || "Інше", date: cells[2] || "Імпортовано", amount: value };
    }).filter(item => Number.isFinite(item.amount) && item.amount !== 0);
    setTransactions([...imported, ...transactions]);
    notify(`Імпортовано операцій: ${imported.length}`);
  }

  if (!loggedIn) return <Login dark={dark} setDark={setDark} showPassword={showPassword} setShowPassword={setShowPassword} login={() => setLoggedIn(true)}/>;

  const nav: [Page, React.ReactNode][] = [
    ["Головна", <Home key="h"/>], ["Операції", <ArrowUpRight key="o"/>], ["Бюджет", <BarChart3 key="b"/>],
    ["Рахунки", <WalletCards key="r"/>], ["Цілі", <Target key="c"/>],
    ["Аналітика", <PieChart key="a"/>], ["Борги", <HandCoins key="d"/>],
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
      {page === "Операції" && <TransactionsView transactions={filteredTransactions} search={search} setSearch={setSearch} remove={removeTransaction} exportCsv={() => exportCsv(transactions, notify)}/>}
      {page === "Бюджет" && <BudgetView budgets={savedBudgets} transactions={transactions} add={()=>setModal("budget")}/>}
      {page === "Рахунки" && <AccountsView accounts={accounts} rates={rates} add={() => setModal("account")} transfer={()=>setModal("transfer")} remove={removeAccount}/>}
      {page === "Цілі" && <GoalsView goals={goals} add={()=>setModal("goal")} contribute={(id,amount)=>financeAction({action:"contributeGoal",id,amount},"Ціль поповнено")} recurring={recurring} addRecurring={()=>setModal("recurring")}/>}
      {page === "Аналітика" && <AnalyticsView transactions={transactions}/>}
      {page === "Борги" && <DebtsView debts={debts} add={()=>setModal("debt")} settle={id=>financeAction({action:"settleDebt",id},"Борг закрито")}/>}
      {page === "Налаштування" && <SettingsView dark={dark} setDark={setDark} importCsv={importCsv} categories={categories} audit={audit} pushEnabled={pushEnabled} enablePush={enablePush} installApp={installApp} addCategory={()=>setModal("category")} deleteCategory={id=>financeAction({action:"deleteCategory",id},"Категорію видалено")} logout={async () => {
        if (initialLoggedIn) {
          await fetch("/auth/signout", { method: "POST" });
          window.location.href = "/auth";
        } else setLoggedIn(false);
      }} notify={notify}/>}
      {page === "Налаштування" && initialLoggedIn && <section className="panel passkey-panel">
        <div><strong>Швидкий вхід на цьому пристрої</strong><small>Face ID, Touch ID, Windows Hello або PIN пристрою</small></div>
        <PasskeyButton mode="register" className="small-primary" onMessage={notify}/>
      </section>}
      {page === "Налаштування" && initialLoggedIn && <section className="panel passkey-panel">
        <div><strong>Спільний фінансовий простір</strong><small>Запросіть партнера або родину з окремою роллю доступу</small></div>
        <button className="small-primary" onClick={()=>setModal("invite")}><Plus/> Запросити учасника</button>
      </section>}

      <nav className="mobile-nav">
        <button className={page === "Головна" ? "active" : ""} onClick={() => setPage("Головна")}><Home/><small>Головна</small></button>
        <button className={page === "Операції" ? "active" : ""} onClick={() => setPage("Операції")}><ArrowUpRight/><small>Операції</small></button>
        <button className="central" onClick={() => setModal("expense")}><Plus/><small>Додати</small></button>
        <button className={page === "Бюджет" ? "active" : ""} onClick={() => setPage("Бюджет")}><BarChart3/><small>Бюджет</small></button>
        <button className={page === "Налаштування" ? "active" : ""} onClick={() => setPage("Налаштування")}><MoreHorizontal/><small>Ще</small></button>
      </nav>
    </section>

    {modal === "expense" && <ExpenseModal amount={amount} setAmount={setAmount} note={note} setNote={setNote} accounts={accounts} categories={categories} submit={addExpense} close={() => setModal(null)}/>}
    {modal === "account" && <AccountModal submit={addAccount} close={() => setModal(null)}/>}
    {modal === "goal" && <GoalModal submit={addGoal} close={()=>setModal(null)}/>}
    {modal === "debt" && <DebtModal submit={addDebt} close={()=>setModal(null)}/>}
    {modal === "recurring" && <RecurringModal submit={addRecurring} close={()=>setModal(null)}/>}
    {modal === "transfer" && <TransferModal accounts={accounts} submit={addTransfer} close={()=>setModal(null)}/>}
    {modal === "budget" && <BudgetModal categories={categories} submit={addBudget} close={()=>setModal(null)}/>}
    {modal === "category" && <CategoryModal submit={addCategory} close={()=>setModal(null)}/>}
    {modal === "invite" && <InviteModal submit={createInvite} close={()=>setModal(null)}/>}
    {toast && <div className="toast">{toast}</div>}
    {syncing && <div className="sync-pill">Синхронізація…</div>}
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

function TransactionsView({ transactions, search, setSearch, remove, exportCsv }: {transactions:Transaction[];search:string;setSearch:(s:string)=>void;remove:(id:number|string)=>void;exportCsv:()=>void}) {
  const [account,setAccount]=useState("");const [category,setCategory]=useState("");const [owner,setOwner]=useState("");const [tag,setTag]=useState("");const [from,setFrom]=useState("");const [to,setTo]=useState("");
  const unique=(values:(string|undefined)[])=>Array.from(new Set(values.filter(Boolean) as string[])).sort();
  const shown=transactions.filter(t=>(!account||t.account===account)&&(!category||t.category===category)&&(!owner||t.owner===owner)&&(!tag||t.tags?.includes(tag))&&(!from||!t.bookedAt||t.bookedAt>=`${from}T00:00:00`)&&(!to||!t.bookedAt||t.bookedAt<=`${to}T23:59:59`));
  const clear=()=>{setAccount("");setCategory("");setOwner("");setTag("");setFrom("");setTo("");};
  return <section className="panel full-view"><div className="view-toolbar"><label className="search-box"><Search/><input placeholder="Пошук за назвою або категорією" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="secondary" onClick={clear}><X/> Очистити</button><button className="secondary" onClick={exportCsv}><Download/> CSV</button></div><div className="filter-grid"><label>Рахунок<select value={account} onChange={e=>setAccount(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.account)).map(v=><option key={v}>{v}</option>)}</select></label><label>Категорія<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.category)).map(v=><option key={v}>{v}</option>)}</select></label><label>Тег<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">Усі</option>{unique(transactions.flatMap(t=>t.tags||[])).map(v=><option key={v}>{v}</option>)}</select></label><label>Власник<select value={owner} onChange={e=>setOwner(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.owner)).map(v=><option key={v}>{v}</option>)}</select></label><label>Від<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>До<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div><div className="data-head"><span>Операція</span><span>Категорія</span><span>Дата</span><span>Сума</span><span/></div>{shown.map(t=><div className="data-row" key={t.id}><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}<small className="row-tags">{t.tags?.map(x=>`#${x}`).join(" ")}</small></strong><span>{t.category}<small>{t.account}{t.owner?` · ${t.owner}`:""}</small></span><span>{t.date}</span><b className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} ₴ {formatMoney(t.amount)}</b><button className="icon-button danger" onClick={()=>remove(t.id)}><Trash2/></button></div>)}{shown.length===0&&<div className="empty">Нічого не знайдено</div>}</section>;
}
function BudgetView({budgets,transactions,add}:{budgets:BudgetItem[];transactions:Transaction[];add:()=>void}) { const active=budgets.length?budgets:budgetRows.map((b,i)=>({id:`d${i}`,categoryId:"",name:b.name,limit:b.limit,currency:"UAH",month:"2026-07-01",color:b.color}));const spentBy=transactions.filter(t=>t.amount<0).reduce<Record<string,number>>((a,t)=>{a[t.category]=(a[t.category]||0)+Math.abs(t.amount);return a;},{});const plan=active.reduce((s,b)=>s+b.limit,0);const spent=Object.values(spentBy).reduce((s,v)=>s+v,0);const day=Math.max(1,new Date().getDate());const days=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();const forecast=Math.round(spent/day*days);return <><div className="metric-grid"><article className="metric"><small>Місячний план</small><strong>₴ {formatMoney(plan)}</strong><span>{plan?Math.round(spent/plan*100):0}% використано</span></article><article className="metric"><small>Прогноз витрат</small><strong>₴ {formatMoney(forecast)}</strong><span className={forecast>plan?"negative":"positive"}>{forecast>plan?"Можливий перерозхід":"У межах плану"}</span></article><article className="metric"><small>Очікуваний залишок</small><strong>₴ {formatMoney(Math.max(0,plan-forecast))}</strong><span>За поточного темпу</span></article></div><section className="panel full-view"><div className="section-title"><div><h2>Ліміти за категоріями</h2><p>Поточний місяць</p></div><button className="small-primary" onClick={add}><Plus/> Додати ліміт</button></div><div className="large-budget"><div className="budget-list">{active.map(b=>{const used=spentBy[b.name]||0;const pct=Math.round(used/b.limit*100);return <div className="budget-item" key={b.id}><span className="budget-icon" style={{color:b.color,background:`${b.color}15`}}><Utensils/></span><div><div><strong>{b.name}</strong><small>₴ {formatMoney(used)} / {formatMoney(b.limit)} · {pct}%</small></div><span><i style={{width:`${Math.min(100,pct)}%`,background:pct>=100?"#e05252":pct>=80?"#f4b740":b.color}}/></span></div></div>})}</div></div>{active.some(b=>(spentBy[b.name]||0)/b.limit>=.8)&&<div className="alert-card"><Bell/><div><strong>Наближення до ліміту</strong><p>Одна або кілька категорій використані більш ніж на 80%.</p></div></div>}</section></>; }
function AccountsView({accounts,rates,add,transfer,remove}:{accounts:Account[];rates:{currency:string;rate:number;date:string}[];add:()=>void;transfer:()=>void;remove:(id:number|string)=>void}) { const visible=rates.filter(r=>["USD","EUR"].includes(r.currency)); return <section className="panel full-view"><div className="section-title"><div><h2>Усі рахунки</h2><p>UAH, USD та інші валюти</p></div><div className="title-actions"><button className="secondary" onClick={transfer}><ArrowRight/> Переказ / обмін</button><button className="small-primary" onClick={add}><Plus/> Новий рахунок</button></div></div><div className="accounts-grid">{accounts.map(a=><div className="account-wrap" key={a.id}><AccountCard account={a}/><button className="remove-account" onClick={()=>remove(a.id)}><Trash2/> Видалити</button></div>)}</div><div className="rate-card"><Landmark/><div><strong>Офіційний курс НБУ</strong><p>{visible.length ? visible.map(r=>`${r.currency} ${r.rate.toFixed(4)}`).join(" · ") : "Оновлення курсів…"}</p></div><span>{visible[0]?.date || "Сьогодні"}</span></div></section>; }
function GoalsView({goals,add,contribute,recurring,addRecurring}:{goals:GoalItem[];add:()=>void;contribute:(id:string,amount:number)=>void;recurring:RecurringItem[];addRecurring:()=>void}) { const shown=goals.length?goals:[{id:"demo1",name:"Резервний фонд",target:200000,current:120000,currency:"UAH",color:"#6558E8"},{id:"demo2",name:"Подорож до Японії",target:150000,current:38500,currency:"UAH",color:"#159B70"}]; return <><section className="panel full-view"><div className="section-title"><div><h2>Фінансові цілі</h2><p>Накопичення та великі покупки</p></div><button className="small-primary" onClick={add}><Plus/> Нова ціль</button></div><div className="goals-grid">{shown.map(g=>{const percent=Math.min(100,Math.round(g.current/g.target*100));return <article className="goal-card" key={g.id}><span className="goal-icon"><PiggyBank/></span><small>{g.date?`До ${new Date(g.date).toLocaleDateString("uk-UA")}`:"Фінансова ціль"}</small><h3>{g.name}</h3><strong>{g.currency==="UAH"?"₴":g.currency} {formatMoney(g.current)} <span>з {formatMoney(g.target)}</span></strong><div><i style={{width:`${percent}%`,background:g.color}}/></div><p>{percent}% накопичено</p><button onClick={()=>contribute(g.id,1000)}>Поповнити на ₴ 1 000</button></article>})}</div></section><section className="panel recurring-panel"><div className="section-title"><div><h2>Регулярні платежі</h2><p>Підписки, оренда та комунальні</p></div><button className="small-primary" onClick={addRecurring}><Plus/> Додати</button></div><div className="recurring-list">{recurring.length?recurring.map(r=><div key={r.id}><span className="recurring-icon"><Repeat2/></span><strong>{r.name}</strong><small>{r.frequency} · наступний {new Date(r.next).toLocaleDateString("uk-UA")}</small><b>{r.currency} {formatMoney(r.amount)}</b><em>{r.auto?"Автоматично":"Нагадування"}</em></div>):<p className="empty-inline">Регулярних платежів поки немає</p>}</div></section></>; }
function AnalyticsView({transactions}:{transactions:Transaction[]}) { const expenses=transactions.filter(t=>t.amount<0);const total=expenses.reduce((s,t)=>s+Math.abs(t.amount),0);const income=transactions.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);const impulsive=expenses.filter(t=>t.impulse).reduce((s,t)=>s+Math.abs(t.amount),0);const grouped=Object.entries(expenses.reduce<Record<string,number>>((acc,t)=>{acc[t.category]=(acc[t.category]||0)+Math.abs(t.amount);return acc;},{})).sort((a,b)=>b[1]-a[1]);return <><div className="metric-grid"><article className="metric"><small>Усі витрати</small><strong>₴ {formatMoney(total)}</strong><span>Поточний період</span></article><article className="metric"><small>Доходи</small><strong>₴ {formatMoney(income)}</strong><span className="positive">Чистий потік ₴ {formatMoney(income-total)}</span></article><article className="metric"><small>Імпульсивні покупки</small><strong>₴ {formatMoney(impulsive)}</strong><span>{total?Math.round(impulsive/total*100):0}% усіх витрат</span></article></div><div className="analytics-grid"><section className="panel"><div className="section-title"><div><h2>Витрати за категоріями</h2><p>Розподіл поточного періоду</p></div></div><div className="category-chart">{grouped.length?grouped.map(([name,value],i)=><div key={name}><span style={{background:`hsl(${250-i*34} 72% ${58+i*3}%)`}}/><strong>{name}</strong><i><b style={{width:`${value/(grouped[0]?.[1]||1)*100}%`}}/></i><em>{Math.round(value/total*100)}%</em></div>):<p className="empty-inline">Додайте операції для аналітики</p>}</div></section><section className="panel impulse-report"><span className="goal-icon"><TrendingUp/></span><h2>Звіт про імпульсивні витрати</h2><strong>{expenses.filter(t=>t.impulse).length} покупок</strong><p>Позначайте незаплановані покупки під час створення операції. Finora покаже їхню частку та вплив на місячний план.</p><div className="donut" style={{"--percent":`${total?impulsive/total*100:0}%`} as React.CSSProperties}><span>{total?Math.round(impulsive/total*100):0}%</span></div></section></div></>; }
function DebtsView({debts,add,settle}:{debts:DebtItem[];add:()=>void;settle:(id:string)=>void}) { const mine=debts.filter(d=>d.direction==="owed_to_me");const owe=debts.filter(d=>d.direction==="i_owe");return <section className="panel full-view"><div className="section-title"><div><h2>Борги та кредити</h2><p>Хто винен мені та кому винна я</p></div><button className="small-primary" onClick={add}><Plus/> Додати борг</button></div><div className="debt-summary"><article><ArrowDownLeft/><div><small>Мені винні</small><strong>₴ {formatMoney(mine.reduce((s,d)=>s+d.amount,0))}</strong></div></article><article><ArrowUpRight/><div><small>Я винна</small><strong>₴ {formatMoney(owe.reduce((s,d)=>s+d.amount,0))}</strong></div></article></div><div className="debt-list">{debts.map(d=><div key={d.id}><span className={d.direction==="owed_to_me"?"debt-in":"debt-out"}>{d.direction==="owed_to_me"?<ArrowDownLeft/>:<ArrowUpRight/>}</span><div><strong>{d.person}</strong><small>{d.note||"Без нотатки"}{d.due?` · до ${new Date(d.due).toLocaleDateString("uk-UA")}`:""}</small></div><b>{d.currency} {formatMoney(d.amount)}</b><button onClick={()=>settle(d.id)}>Закрити</button></div>)}{!debts.length&&<p className="empty">Активних боргів немає</p>}</div></section>; }
function SettingsView({dark,setDark,logout,notify,importCsv,categories,audit,addCategory,deleteCategory,pushEnabled,enablePush,installApp}:{dark:boolean;setDark:(v:boolean)=>void;logout:()=>void;notify:(s:string)=>void;importCsv:(file:File)=>void;categories:CategoryItem[];audit:AuditItem[];addCategory:()=>void;deleteCategory:(id:string)=>void;pushEnabled:boolean;enablePush:()=>void;installApp:()=>void}) { return <><div className="settings-grid"><section className="panel settings-card"><h2>Загальні</h2><label>Базова валюта<select defaultValue="UAH"><option>UAH — гривня</option><option>USD — долар</option><option>EUR — євро</option></select></label><label>Власник за замовчуванням<input defaultValue="Мій"/></label><label className="setting-toggle"><span><strong>Темна тема</strong><small>Змінити вигляд застосунку</small></span><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/></label><button className="primary" onClick={()=>notify("Налаштування збережено")}>Зберегти</button></section><section className="panel settings-card"><h2>Застосунок та інтеграції</h2><button className="integration" onClick={installApp}><Download/><span><strong>Встановити Finora</strong><small>На домашній екран iOS, Android або ПК</small></span><ArrowRight/></button><button className="integration" onClick={enablePush}><Bell/><span><strong>{pushEnabled?"Сповіщення увімкнено":"Увімкнути сповіщення"}</strong><small>Алерти 80% і 100% бюджету</small></span><ArrowRight/></button><label className="integration file-integration"><Upload/><span><strong>Імпорт даних</strong><small>CSV до 5 МБ</small></span><ArrowRight/><input type="file" accept=".csv,text/csv" onChange={e=>{const file=e.target.files?.[0];if(file)importCsv(file);e.target.value="";}}/></label><button className="integration" onClick={()=>notify("Додайте Telegram chat ID у профіль Supabase")}><Goal/><span><strong>Telegram-бот</strong><small>Команда: 300 кава #робота</small></span><ArrowRight/></button><button className="logout" onClick={logout}>Вийти з акаунта</button></section></div><div className="settings-lower"><section className="panel"><div className="section-title"><div><h2>Категорії</h2><p>Власні назви, кольори та Lucide-іконки</p></div><button className="small-primary" onClick={addCategory}><Plus/> Категорія</button></div><div className="category-manager">{categories.map(c=><div key={c.id}><span style={{background:c.color}}/><strong>{c.name}</strong><small>{c.kind==="income"?"Дохід":"Витрата"}</small><button onClick={()=>deleteCategory(c.id)}><Trash2/></button></div>)}</div></section><section className="panel"><div className="section-title"><div><h2>Історія змін</h2><p>Останні ключові дії</p></div></div><div className="audit-list">{audit.slice(0,12).map(item=><div key={item.id}><span>{item.action==="insert"?"+":item.action==="delete"?"−":"↻"}</span><div><strong>{translateEntity(item.entity)}</strong><small>{translateAction(item.action)} · {new Date(item.created).toLocaleString("uk-UA")}</small></div></div>)}{!audit.length&&<p className="empty-inline">Історія з’явиться після змін у Supabase</p>}</div></section></div></>; }

function AccountCard({account}:{account:Account}) { const days=account.graceEnd?Math.ceil((new Date(account.graceEnd).getTime()-Date.now())/86400000):null;return <article className={`account ${account.style}`}><div><span className="bank-icon">{account.bank==="Готівка"?<Landmark/>:account.bank[0].toUpperCase()}</span>{days!==null&&<em className={days<=7?"grace urgent":"grace"}>{days>=0?`${days} дн. грейсу`:"Грейс минув"}</em>}</div><p>{account.name}</p><h3>{account.currency==="UAH"?"₴":"$"} {formatMoney(account.balance)}</h3><small>{account.bank} · {account.owner}{account.creditLimit?` · ліміт ${formatMoney(account.creditLimit)}`:""}</small></article>; }
function TransactionList({transactions}:{transactions:Transaction[]}) { return <div className="tx-list">{transactions.map(t=><div className="tx" key={t.id}><span className={`tx-icon ${t.amount>0?"income":"shop"}`}>{t.amount>0?<ArrowDownLeft/>:<ShoppingBag/>}</span><div className="tx-info"><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}</strong><small>{t.category} · {t.date}</small></div><strong className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} ₴ {formatMoney(t.amount)}</strong></div>)}</div>; }
function BudgetRows({rows}:{rows:typeof budgetRows}) { return <div className="budget-list">{rows.map(b=><div className="budget-item" key={b.name}><span className="budget-icon" style={{color:b.color,background:`${b.color}15`}}><Utensils/></span><div><div><strong>{b.name}</strong><small>₴ {formatMoney(b.spent)} / {formatMoney(b.limit)}</small></div><span><i style={{width:`${b.spent/b.limit*100}%`,background:b.color}}/></span></div></div>)}</div>; }
function ExpenseModal({amount,setAmount,note,setNote,accounts,categories,submit,close}:{amount:string;setAmount:(s:string)=>void;note:string;setNote:(s:string)=>void;accounts:Account[];categories:CategoryItem[];submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal tall-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Деталізація операції" title="Нова витрата" close={close}/><label className="amount-field"><span>₴</span><input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label><div className="form-two"><label>Рахунок<select name="account">{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label><label>Категорія<select name="category"><option value="">Без категорії</option>{categories.filter(c=>c.kind==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><label>Дата<input name="date" type="datetime-local"/></label><label>Нотатка<input placeholder="Наприклад, кава" value={note} onChange={e=>setNote(e.target.value)}/></label><label>Теги<input name="tags" placeholder="#відпустка #робота"/></label><details className="split-details"><summary>Розділити чек</summary><div className="form-two"><label>Загальна сума<input name="splitTotal" type="number" min="0" step=".01"/></label><label>Моя частка<input name="personalShare" type="number" min="0" step=".01"/></label></div></details><label className="check impulse"><input name="impulse" type="checkbox"/> Імпульсивна витрата</label><button className="primary">Додати витрату</button></form></div>; }
function AccountModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Новий актив" title="Додати рахунок" close={close}/><label>Назва<input name="name" placeholder="Наприклад, Зарплатна картка" required/></label><div className="form-two"><label>Банк<input name="bank" placeholder="monobank"/></label><label>Власник<input name="owner" placeholder="Мій"/></label></div><div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Баланс<input name="balance" type="number" placeholder="0"/></label></div><details className="split-details"><summary>Кредитна картка</summary><div className="form-two"><label>Кредитний ліміт<input name="creditLimit" type="number" min="0" placeholder="0"/></label><label>Кінець грейс-періоду<input name="graceEnd" type="date"/></label></div></details><button className="primary">Створити рахунок</button></form></div>; }
function GoalModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Накопичення" title="Нова фінансова ціль" close={close}/><label>Назва<input name="name" required placeholder="Резервний фонд"/></label><div className="form-two"><label>Цільова сума<input name="target" type="number" min="1" required/></label><label>Вже накопичено<input name="current" type="number" min="0" defaultValue="0"/></label></div><div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Цільова дата<input name="date" type="date"/></label></div><button className="primary">Створити ціль</button></form></div>; }
function DebtModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Облік зобов’язань" title="Новий борг" close={close}/><label>Людина або організація<input name="person" required placeholder="Олексій"/></label><div className="form-two"><label>Напрям<select name="direction"><option value="owed_to_me">Мені винні</option><option value="i_owe">Я винна</option></select></label><label>Сума<input name="amount" type="number" min="1" required/></label></div><div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Повернути до<input name="date" type="date"/></label></div><label>Нотатка<input name="note" placeholder="За квитки"/></label><button className="primary">Додати борг</button></form></div>; }
function RecurringModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Автоматизація" title="Регулярний платіж" close={close}/><label>Назва<input name="name" required placeholder="Netflix"/></label><div className="form-two"><label>Сума<input name="amount" type="number" min="1" required/></label><label>Період<select name="frequency"><option value="monthly">Щомісяця</option><option value="weekly">Щотижня</option><option value="yearly">Щороку</option></select></label></div><label>Наступна дата<input name="date" type="datetime-local" required/></label><label className="check impulse"><input name="auto" type="checkbox"/> Створювати операцію автоматично</label><button className="primary">Зберегти платіж</button></form></div>; }
function TransferModal({accounts,submit,close}:{accounts:Account[];submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Між власними рахунками" title="Переказ або обмін" close={close}/><div className="form-two"><label>З рахунку<select name="from" required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label><label>На рахунок<select name="to" required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label></div><div className="form-two"><label>Сума списання<input name="sent" type="number" min=".01" step=".01" required/></label><label>Сума зарахування<input name="received" type="number" min=".01" step=".01" required/></label></div><div className="form-two"><label>Курс обміну<input name="rate" type="number" min=".000001" step=".000001" defaultValue="1"/></label><label>Комісія<input name="fee" type="number" min="0" step=".01" defaultValue="0"/></label></div><label>Валюта комісії<select name="feeCurrency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Нотатка<input name="note" placeholder="Обмін на відпустку"/></label><button className="primary">Виконати переказ</button></form></div>; }
function BudgetModal({categories,submit,close}:{categories:CategoryItem[];submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { const now=new Date();const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Планування" title="Ліміт категорії" close={close}/><label>Категорія<select name="category" required>{categories.filter(c=>c.kind==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="form-two"><label>Місяць<input name="month" type="month" defaultValue={month} required/></label><label>Ліміт, ₴<input name="limit" type="number" min="1" required/></label></div><button className="primary">Зберегти ліміт</button></form></div>; }
function CategoryModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Персоналізація" title="Нова категорія" close={close}/><label>Назва<input name="name" required placeholder="Домашні улюбленці"/></label><div className="form-two"><label>Тип<select name="kind"><option value="expense">Витрата</option><option value="income">Дохід</option></select></label><label>Lucide-іконка<select name="icon"><option>CircleDollarSign</option><option>ShoppingBag</option><option>Utensils</option><option>Car</option><option>House</option><option>HeartPulse</option><option>Sparkles</option></select></label></div><label>Колір<input name="color" type="color" defaultValue="#6558e8"/></label><button className="primary">Створити категорію</button></form></div>; }
function InviteModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Спільне планування" title="Запросити учасника" close={close}/><label>Email<input name="email" type="email" required placeholder="partner@example.com"/></label><label>Роль<select name="role"><option value="member">Учасник — може редагувати фінанси</option><option value="viewer">Глядач — лише перегляд</option><option value="admin">Адміністратор — може запрошувати</option></select></label><div className="form-message success">Одноразове посилання діятиме 7 днів і буде скопійоване в буфер обміну.</div><button className="primary">Створити запрошення</button></form></div>; }
function ModalHead({label,title,close}:{label:string;title:string;close:()=>void}) { return <div className="modal-head"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><button type="button" onClick={close}><X/></button></div>; }
function exportCsv(items:Transaction[],notify:(s:string)=>void) { const csv=["Назва,Категорія,Дата,Сума",...items.map(t=>`"${t.title}","${t.category}","${t.date}",${t.amount}`)].join("\n"); const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download="finora-transactions.csv";a.click();URL.revokeObjectURL(url);notify("CSV-файл завантажено"); }
function translateEntity(value:string){return ({transactions:"Операція",accounts:"Рахунок",transfers:"Переказ",budgets:"Бюджет"} as Record<string,string>)[value]||value}
function translateAction(value:string){return ({insert:"створено",update:"змінено",delete:"видалено"} as Record<string,string>)[value]||value}
