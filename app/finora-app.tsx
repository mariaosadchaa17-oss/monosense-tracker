"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, Check,
  ChevronDown, CircleDollarSign, CreditCard, Download, Eye, EyeOff,
  Fingerprint, Goal, Home, Landmark, Moon, MoreHorizontal, PiggyBank, Plus,
  Search, Settings, ShoppingBag, Sparkles, Sun, Target, Trash2,
  TrendingUp, Upload, Utensils, WalletCards, X, PieChart, HandCoins, Repeat2,
  Bus,Car,Coffee,Dumbbell,Gamepad2,Gift,GraduationCap,HeartPulse,House,
  PawPrint,Plane,Shirt,ShoppingCart,Smartphone,Wifi
} from "lucide-react";
import {PasskeyButton} from "./components/passkey-button";

type Page = "Головна" | "Операції" | "Бюджет" | "Рахунки" | "Цілі" | "Аналітика" | "Борги" | "Налаштування";
type Transaction = { id: number | string; title: string; category: string;categoryIcon?:string; date: string; bookedAt?:string; account?:string; owner?:string; tags?:string[]; amount: number;currency?:string;baseAmount?:number; impulse?: boolean };
type Account = { id: number | string; name: string; bank: string; owner: string; currency: string; balance: number; style: string;color?:string;creditLimit?:number;graceEnd?:string };
type GoalItem = {id:string;name:string;target:number;current:number;currency:string;date?:string;color:string};
type DebtItem = {id:string;person:string;direction:"owed_to_me"|"i_owe";amount:number;currency:string;due?:string;note?:string};
type RecurringItem = {id:string;name:string;amount:number;currency:string;frequency:string;next:string;auto:boolean};
type CategoryItem = {id:string;name:string;kind:string;color:string;icon:string};
type BudgetItem = {id:string;categoryId:string;name:string;icon:string;limit:number;currency:string;month:string;period:"month"|"week";color:string};
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
const seedCategories:CategoryItem[]=[
  {id:"cat-food",name:"Продукти",kind:"expense",color:"#ff6b55",icon:"ShoppingCart"},
  {id:"cat-cafe",name:"Кафе та ресторани",kind:"expense",color:"#f4b740",icon:"Coffee"},
  {id:"cat-transport",name:"Транспорт",kind:"expense",color:"#6558e8",icon:"Bus"},
  {id:"cat-home",name:"Дім і затишок",kind:"expense",color:"#159b70",icon:"House"},
  {id:"cat-health",name:"Здоров’я",kind:"expense",color:"#e0527d",icon:"HeartPulse"},
  {id:"cat-fun",name:"Розваги",kind:"expense",color:"#8b72f6",icon:"Gamepad2"},
  {id:"cat-salary",name:"Зарплата",kind:"income",color:"#159b70",icon:"WalletCards"},
];
const seedGoals:GoalItem[]=[
  {id:"demo1",name:"Резервний фонд",target:200000,current:120000,currency:"UAH",color:"#6558E8"},
  {id:"demo2",name:"Подорож до Японії",target:150000,current:38500,currency:"UAH",color:"#159B70"},
];

const formatMoney = (value: number) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(Math.abs(value));
const currencySymbol=(currency:string)=>({UAH:"₴",USD:"$",EUR:"€",GBP:"£",PLN:"zł"} as Record<string,string>)[currency]||currency;
const conversionRate=(currency:string,rates:{currency:string;rate:number}[],customRates:{currency:string;rate:number}[])=>currency==="UAH"?1:(customRates.find(rate=>rate.currency===currency)?.rate||rates.find(rate=>rate.currency===currency)?.rate||1);

export function FinoraApp({ initialLoggedIn = false }: { initialLoggedIn?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage] = useState<Page>("Головна");
  const [dark, setDark] = useState(()=>typeof window!=="undefined"&&(localStorage.getItem("rivna-theme")||localStorage.getItem("finora-theme"))==="dark");
  const [modal, setModal] = useState<"expense" | "account" | "goal" | "debt" | "recurring" | "transfer" | "budget" | "category" | "invite" | "rate" | null>(null);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [accounts, setAccounts] = useState(seedAccounts);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [rates, setRates] = useState<{currency:string;rate:number;date:string}[]>([]);
  const [customRates,setCustomRates]=useState<{currency:string;rate:number;date:string}[]>([]);
  const [syncing, setSyncing] = useState(initialLoggedIn);
  const [goals, setGoals] = useState<GoalItem[]>(initialLoggedIn?[]:seedGoals);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(initialLoggedIn?[]:seedCategories);
  const [savedBudgets, setSavedBudgets] = useState<BudgetItem[]>([]);
  const [planningPeriod,setPlanningPeriod]=useState<"month"|"week">("month");
  const [baseCurrency,setBaseCurrency]=useState("UAH");
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
  const [pushEnabled,setPushEnabled]=useState(false);
  const [editingAccount,setEditingAccount]=useState<Account|null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onInstall=(event:Event)=>{event.preventDefault();setInstallPrompt(event)};
    window.addEventListener("beforeinstallprompt",onInstall);
    const timer=window.setTimeout(()=>{const params=new URLSearchParams(location.search);if(params.get("action")==="expense")setModal("expense");if(params.get("section")==="budget")setPage("Бюджет");if("Notification" in window)setPushEnabled(Notification.permission==="granted")},0);
    return()=>{window.clearTimeout(timer);window.removeEventListener("beforeinstallprompt",onInstall)};
  }, []);
  function notify(message:string){setToast(message);window.setTimeout(()=>setToast(""),2200)}
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
        balance: Number(item.balance), style: bankStyle(String(item.bank||""),index),
        color:item.card_color?String(item.card_color):undefined,
        creditLimit:Number(item.credit_limit)||0,graceEnd:item.grace_period_end?String(item.grace_period_end):undefined,
      })));
      setTransactions((data.transactions || []).map((item: Record<string, unknown>) => ({
        id: String(item.id), title: String(item.note || (item.type === "income" ? "Дохід" : "Витрата")),
        category:String((item.categories as {name?:string}|null)?.name||"Без категорії"),categoryIcon:String((item.categories as {icon?:string}|null)?.icon||"CircleDollarSign"),
        date: new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(item.booked_at))),
        bookedAt:String(item.booked_at),account:String((item.accounts as {name?:string}|null)?.name||""),
        owner:String((item.accounts as {owner_label?:string}|null)?.owner_label||""),
        tags:((item.transaction_tags as {tags?:{name?:string}|null}[]|null)||[]).map(link=>String(link.tags?.name||"")).filter(Boolean),
        amount:Number(item.amount)*(item.type==="income"?1:-1),currency:String(item.currency||"UAH"),impulse:Boolean(item.is_impulsive),
      })));
      setGoals((data.goals||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),target:Number(item.target_amount),current:Number(item.current_amount),currency:String(item.currency),date:item.target_date?String(item.target_date):undefined,color:String(item.color||"#6558E8")})));
      setDebts((data.debts||[]).map((item:Record<string,unknown>)=>({id:String(item.id),person:String(item.person),direction:item.direction==="i_owe"?"i_owe":"owed_to_me",amount:Number(item.amount),currency:String(item.currency),due:item.due_date?String(item.due_date):undefined,note:String(item.note||"")})));
      setRecurring((data.recurring||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),amount:Number(item.amount),currency:String(item.currency),frequency:String(item.frequency),next:String(item.next_run_at),auto:Boolean(item.auto_create)})));
      setCategories((data.categories||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),kind:String(item.kind),color:String(item.color||"#6558E8"),icon:String(item.icon||"CircleDollarSign")})));
      setSavedBudgets((data.budgets||[]).map((item:Record<string,unknown>)=>({id:String(item.id),categoryId:String(item.category_id),name:String((item.categories as {name?:string}|null)?.name||"Категорія"),icon:String((item.categories as {icon?:string}|null)?.icon||"CircleDollarSign"),limit:Number(item.limit_amount),currency:String(item.currency),month:String(item.month),period:item.period_type==="week"?"week":"month",color:String((item.categories as {color?:string}|null)?.color||"#6558E8")})));
      setPlanningPeriod(data.planningPeriod==="week"?"week":"month");
      setBaseCurrency(String(data.baseCurrency||"UAH"));
      setAudit((data.audit||[]).map((item:Record<string,unknown>)=>({id:String(item.id),entity:String(item.entity_type),action:String(item.action),created:String(item.created_at),actor:item.actor_id?String(item.actor_id):undefined})));
      setCustomRates((data.exchangeRates||[]).map((item:Record<string,unknown>)=>({currency:String(item.quote_currency),rate:Number(item.custom_rate||item.official_rate),date:String(item.rate_date)})));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Помилка синхронізації");
    } finally { setSyncing(false); }
  }
  // Refresh once when the authenticated application is mounted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer=window.setTimeout(()=>void refreshFinance(),0);return()=>window.clearTimeout(timer); }, [initialLoggedIn]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("rivna-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    fetch("/api/exchange-rates").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.rates) setRates(data.rates);
    }).catch(() => {});
  }, []);

  const balance=useMemo(()=>accounts.reduce((sum,account)=>sum+account.balance*conversionRate(account.currency,rates,customRates)/conversionRate(baseCurrency,rates,customRates),0),[accounts,rates,customRates,baseCurrency]);
  const normalizedTransactions=useMemo(()=>transactions.map(transaction=>({...transaction,baseAmount:transaction.amount*conversionRate(transaction.currency||"UAH",rates,customRates)/conversionRate(baseCurrency,rates,customRates)})),[transactions,rates,customRates,baseCurrency]);
  const filteredTransactions = transactions.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const value = Number(amount.replace(",", "."));
    if (!value) return;
    const operationType=form.get("type")==="income"?"income":"expense",isIncome=operationType==="income";
    if (initialLoggedIn) {
      const account = accounts.find(a=>String(a.id)===String(form.get("account")))||accounts[0];
      if (!account) return notify("Спочатку створіть рахунок");
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        action:"createTransaction", accountId:account.id, categoryId:form.get("category")||null, amount:value, currency:account.currency, note, type:operationType,
        isImpulsive:!isIncome&&form.get("impulse")==="on",splitTotal:isIncome?null:form.get("splitTotal")||null,personalShare:isIncome?null:form.get("personalShare")||null,
        bookedAt:form.get("date")?new Date(String(form.get("date"))).toISOString():undefined,
        tags:String(form.get("tags")||"").split(/\s+/).filter(Boolean),splitParticipants:String(form.get("splitParticipants")||"").split(",").map(value=>value.trim()).filter(Boolean),
        repeat:!isIncome&&form.get("repeat")==="on",repeatFrequency:form.get("repeatFrequency"),repeatDay:form.get("repeatDay"),
      })});
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося додати операцію");
      setAmount(""); setNote(""); setModal(null); notify(isIncome?"Дохід збережено":"Витрату збережено");
      await refreshFinance(); return;
    }
    const account=accounts.find(item=>String(item.id)===String(form.get("account")))||accounts[0];
    setTransactions([{id:Date.now(),title:note||(isIncome?"Новий дохід":"Нова витрата"),category:categories.find(c=>c.id===form.get("category"))?.name||"Інше",date:"Щойно",amount:isIncome?value:-value,currency:account?.currency||"UAH",impulse:!isIncome&&form.get("impulse")==="on"},...transactions]);
    setAmount(""); setNote(""); setModal(null); notify(isIncome?"Дохід додано":"Витрату додано");
  }
  async function addAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (initialLoggedIn) {
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        action:editingAccount?"updateAccount":"createAccount",id:editingAccount?.id, name:form.get("name"), bank:form.get("bank"), owner:form.get("owner"),
        currency:form.get("currency"), balance:form.get("balance"),
        creditLimit:form.get("creditLimit"),graceEnd:form.get("graceEnd"),cardColor:form.get("cardColor"),
      })});
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося створити рахунок");
      setModal(null);setEditingAccount(null); notify("Рахунок збережено"); await refreshFinance(); return;
    }
    setAccounts([...accounts, {
      id: Date.now(), name: String(form.get("name") || "Новий рахунок"), bank: String(form.get("bank") || "Інший"),
      owner: String(form.get("owner") || "Мій"), currency: String(form.get("currency") || "UAH"),
      balance: Number(form.get("balance")) || 0, style: "stash",color:String(form.get("cardColor")||"#6558e8"),
    }]);
    setModal(null);setEditingAccount(null); notify("Рахунок створено");
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
    if(!initialLoggedIn){
      const action=String(payload.action||""),id=String(payload.id||"");
      if(action==="createGoal")setGoals(items=>[...items,{id:`goal-${Date.now()}`,name:String(payload.name||"Нова ціль"),target:Number(payload.targetAmount),current:Number(payload.currentAmount)||0,currency:String(payload.currency||"UAH"),date:payload.targetDate?String(payload.targetDate):undefined,color:"#6558E8"}]);
      else if(action==="contributeGoal")setGoals(items=>items.map(item=>item.id===id?{...item,current:Math.min(item.target,item.current+Number(payload.amount||0))}:item));
      else if(action==="createDebt")setDebts(items=>[...items,{id:`debt-${Date.now()}`,person:String(payload.person||"Контакт"),direction:payload.direction==="i_owe"?"i_owe":"owed_to_me",amount:Number(payload.amount),currency:String(payload.currency||"UAH"),due:payload.dueDate?String(payload.dueDate):undefined,note:String(payload.note||"")}]);
      else if(action==="settleDebt")setDebts(items=>items.filter(item=>item.id!==id));
      else if(action==="createRecurring")setRecurring(items=>[...items,{id:`rec-${Date.now()}`,name:String(payload.name||"Платіж"),amount:Number(payload.amount),currency:String(payload.currency||"UAH"),frequency:String(payload.frequency||"monthly"),next:String(payload.nextRunAt),auto:Boolean(payload.autoCreate)}]);
      else if(action==="createBudget"){
        const category=categories.find(item=>item.id===String(payload.categoryId));if(!category)return false;
        const next:BudgetItem={id:`budget-${Date.now()}`,categoryId:category.id,name:category.name,icon:category.icon,limit:Number(payload.limitAmount),currency:String(payload.currency||"UAH"),month:String(payload.month),period:payload.periodType==="week"?"week":"month",color:category.color};
        setSavedBudgets(items=>[...items.filter(item=>!(item.categoryId===next.categoryId&&item.month===next.month&&item.period===next.period)),next]);
      }else if(action==="createCategory")setCategories(items=>[...items,{id:`cat-${Date.now()}`,name:String(payload.name||"Категорія"),kind:String(payload.kind||"expense"),color:String(payload.color||"#6558E8"),icon:String(payload.icon||"CircleDollarSign")}]);
      else if(action==="deleteCategory")setCategories(items=>items.filter(item=>item.id!==id));
      else if(action==="createCustomRate")setCustomRates(items=>[{currency:String(payload.quoteCurrency||"USD"),rate:Number(payload.rate),date:String(payload.date||new Date().toISOString().slice(0,10))},...items.filter(item=>item.currency!==String(payload.quoteCurrency))]);
      else if(action==="createTransfer"){
        const from=String(payload.fromAccountId),to=String(payload.toAccountId),sent=Number(payload.sentAmount),received=Number(payload.receivedAmount),fee=Number(payload.feeAmount)||0;
        if(from===to){notify("Оберіть різні рахунки");return false}
        setAccounts(items=>items.map(item=>String(item.id)===from?{...item,balance:item.balance-sent-(String(payload.feeCurrency)===item.currency?fee:0)}:String(item.id)===to?{...item,balance:item.balance+received-(String(payload.feeCurrency)===item.currency?fee:0)}:item));
      }else return false;
      notify(success);return true;
    }
    const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json(); if(!response.ok){notify(result.error||"Помилка збереження");return false;}
    notify(success);await refreshFinance();return true;
  }
  async function addGoal(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createGoal",name:f.get("name"),targetAmount:f.get("target"),currentAmount:f.get("current"),currency:f.get("currency"),targetDate:f.get("date")},"Ціль створено"))setModal(null);}
  async function addDebt(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createDebt",person:f.get("person"),direction:f.get("direction"),amount:f.get("amount"),currency:f.get("currency"),dueDate:f.get("date"),note:f.get("note")},"Борг додано"))setModal(null);}
  async function addRecurring(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const account=accounts.find(item=>String(item.id)===String(f.get("account")));if(!account)return notify("Оберіть рахунок");if(await financeAction({action:"createRecurring",accountId:account.id,categoryId:f.get("category")||null,name:f.get("name"),amount:f.get("amount"),currency:account.currency,frequency:f.get("frequency"),nextRunAt:f.get("date"),autoCreate:f.get("auto")==="on"},"Регулярний платіж створено"))setModal(null);}
  async function addTransfer(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createTransfer",fromAccountId:f.get("from"),toAccountId:f.get("to"),sentAmount:f.get("sent"),receivedAmount:f.get("received"),exchangeRate:f.get("rate"),feeAmount:f.get("fee"),feeCurrency:f.get("feeCurrency"),note:f.get("note")},"Переказ виконано"))setModal(null);}
  async function addBudget(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const raw=String(f.get("period"));if(await financeAction({action:"createBudget",categoryId:f.get("category"),month:planningPeriod==="week"?raw:`${raw}-01`,periodType:planningPeriod,limitAmount:f.get("limit"),currency:baseCurrency},"Ліміт збережено"))setModal(null);}
  async function addCategory(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createCategory",name:f.get("name"),kind:f.get("kind"),icon:f.get("icon"),color:f.get("color")},"Категорію створено"))setModal(null);}
  async function addCustomRate(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createCustomRate",quoteCurrency:f.get("currency"),rate:f.get("rate"),date:f.get("date"),baseCurrency:"UAH"},"Власний курс збережено"))setModal(null)}
  async function createInvite(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const response=await fetch("/api/household/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifier:f.get("identifier"),role:f.get("role")})});const result=await response.json();if(!response.ok)return notify(result.error||"Не вдалося створити запрошення");await navigator.clipboard.writeText(result.url);setModal(null);notify(result.emailed?"Запрошення надіслано email, посилання скопійовано":"Посилання запрошення скопійовано");}
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
    const excel=/\.xlsx?$/i.test(file.name);
    if (initialLoggedIn) {
      const response = await fetch(excel?"/api/import/xlsx":"/api/import/csv", { method: "POST", headers: { "Content-Type": excel?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"text/csv" }, body: excel?await file.arrayBuffer():await file.text() });
      const result = await response.json();
      notify(response.ok ? `Імпортовано операцій: ${result.imported}` : result.error || "Помилка імпорту");
      if(response.ok)await refreshFinance();
      return;
    }
    if(excel)return notify("Excel-імпорт доступний після входу");
    const text = await file.text();
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
      <button className="brand brand-button" onClick={() => setPage("Головна")}><span className="brand-mark"><CircleDollarSign/></span> rivna</button>
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

      {page === "Головна" && <Dashboard balance={balance} baseCurrency={baseCurrency} accounts={accounts} transactions={normalizedTransactions} goals={goals} openPage={setPage} addAccount={() => setModal("account")}/>}
      {page === "Операції" && <TransactionsView transactions={filteredTransactions} search={search} setSearch={setSearch} remove={removeTransaction} exportCsv={() => exportCsv(transactions, notify)} exportExcel={()=>exportExcel(transactions,notify)}/>}
      {page === "Бюджет" && (initialLoggedIn?<LiveBudgetView budgets={savedBudgets} transactions={normalizedTransactions} period={planningPeriod} baseCurrency={baseCurrency} add={()=>setModal("budget")}/>:<BudgetView budgets={savedBudgets} transactions={normalizedTransactions} add={()=>setModal("budget")}/>)}
      {page === "Рахунки" && <AccountsView accounts={accounts} rates={rates} customRates={customRates} add={() => {setEditingAccount(null);setModal("account")}} edit={account=>{setEditingAccount(account);setModal("account")}} addRate={()=>setModal("rate")} transfer={()=>setModal("transfer")} remove={removeAccount}/>}
      {page === "Цілі" && <GoalsView goals={goals} add={()=>setModal("goal")} contribute={(id,amount)=>financeAction({action:"contributeGoal",id,amount},"Ціль поповнено")} recurring={recurring} addRecurring={()=>setModal("recurring")}/>}
      {page === "Аналітика" && <AnalyticsView transactions={normalizedTransactions} baseCurrency={baseCurrency}/>}
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
      {page === "Налаштування" && initialLoggedIn && <MembersPanel notify={notify}/>}
      {page === "Налаштування" && initialLoggedIn && <section className="panel passkey-panel">
        <div><strong>Імпорт Microsoft Excel</strong><small>Файл .xlsx до 5 МБ, колонки: Назва, Категорія, Дата, Сума</small></div>
        <label className="small-primary file-button"><Upload/> Обрати Excel<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e=>{const file=e.target.files?.[0];if(file)void importCsv(file);e.target.value=""}}/></label>
      </section>}
      {page === "Налаштування" && <GuideFeedback notify={notify} authenticated={initialLoggedIn}/>}

      <button className="mobile-quick-add" onClick={() => setModal("expense")} aria-label="Додати витрату"><Plus/></button>
      <nav className="mobile-nav" aria-label="Основна навігація">
        <button className={page === "Головна" ? "active" : ""} onClick={() => setPage("Головна")}><Home/><small>Головна</small></button>
        <button className={page === "Аналітика" ? "active" : ""} onClick={() => setPage("Аналітика")}><PieChart/><small>Аналітика</small></button>
        <button className={page === "Рахунки" ? "active" : ""} onClick={() => setPage("Рахунки")}><WalletCards/><small>Рахунки</small></button>
        <button className={page === "Операції" ? "active" : ""} onClick={() => setPage("Операції")}><ArrowUpRight/><small>Операції</small></button>
        <button className={page === "Налаштування" ? "active" : ""} onClick={() => setPage("Налаштування")}><MoreHorizontal/><small>Ще</small></button>
      </nav>
    </section>

    {modal === "expense" && <ExpenseModal amount={amount} setAmount={setAmount} note={note} setNote={setNote} accounts={accounts} categories={categories} submit={addExpense} close={() => setModal(null)}/>}
    {modal === "account" && <AccountModal account={editingAccount} submit={addAccount} close={() => {setEditingAccount(null);setModal(null)}}/>}
    {modal === "goal" && <GoalModal submit={addGoal} close={()=>setModal(null)}/>}
    {modal === "debt" && <DebtModal submit={addDebt} close={()=>setModal(null)}/>}
    {modal === "recurring" && <RecurringModal accounts={accounts} categories={categories} submit={addRecurring} close={()=>setModal(null)}/>}
    {modal === "transfer" && <TransferModal accounts={accounts} submit={addTransfer} close={()=>setModal(null)}/>}
    {modal === "budget" && <BudgetModal categories={categories} period={planningPeriod} baseCurrency={baseCurrency} submit={addBudget} close={()=>setModal(null)}/>}
    {modal === "category" && <CategoryModal submit={addCategory} close={()=>setModal(null)}/>}
    {modal === "invite" && <InviteModal submit={createInvite} close={()=>setModal(null)}/>}
    {modal === "rate" && <CustomRateModal submit={addCustomRate} close={()=>setModal(null)}/>}
    {toast && <div className="toast">{toast}</div>}
    {syncing && <div className="sync-pill">Синхронізація…</div>}
  </main>;
}

function Login({ dark, setDark, showPassword, setShowPassword, login }: {dark:boolean;setDark:(v:boolean)=>void;showPassword:boolean;setShowPassword:(v:boolean)=>void;login:()=>void}) {
  return <main className="auth-shell">
    <section className="auth-brand"><div className="brand large"><span className="brand-mark"><CircleDollarSign/></span> rivna</div>
      <div className="auth-copy"><span className="eyebrow"><Sparkles size={14}/> Гроші без зайвої складності</span><h1>Фінанси, які<br/>нарешті зрозумілі.</h1><p>Рахунки, бюджети та спільні цілі — в одному спокійному просторі.</p></div>
      <div className="auth-stat"><div><small>Бюджет під контролем</small><strong>82%</strong></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/></div></div>
    </section>
    <section className="auth-form-wrap"><button className="theme-btn auth-theme" onClick={() => setDark(!dark)}>{dark ? <Sun/> : <Moon/>}</button>
      <form className="auth-card" onSubmit={e => {e.preventDefault();login();}}><div className="mobile-logo brand"><span className="brand-mark"><CircleDollarSign/></span> rivna</div>
        <div><h2>З поверненням</h2><p>Увійдіть, щоб продовжити</p></div>
        <label>Email<input type="email" defaultValue="maria@example.com" required/></label>
        <label>Пароль<span className="password-field"><input type={showPassword ? "text" : "password"} defaultValue="rivna2026" required/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/> : <Eye/>}</button></span></label>
        <div className="form-row"><label className="check"><input type="checkbox" defaultChecked/> Запам’ятати мене</label><button type="button" className="link" onClick={()=>window.alert("У демо-режимі відновлення пароля не потрібне.")}>Забули пароль?</button></div>
        <button className="primary" type="submit">Увійти <ArrowRight/></button><button className="bio-btn" type="button" onClick={login}><Fingerprint/> Увійти з Touch ID</button>
        <p className="signup">Немає акаунта? <button type="button" onClick={login}>Створити демо</button></p>
      </form>
    </section>
  </main>;
}

function Dashboard({ balance, baseCurrency, accounts, transactions, goals, openPage, addAccount }: {balance:number;baseCurrency:string;accounts:Account[];transactions:Transaction[];goals:GoalItem[];openPage:(p:Page)=>void;addAccount:()=>void}) {
  const [renderedAt]=useState(()=>Date.now()),now=new Date(renderedAt),month=now.getMonth(),year=now.getFullYear();
  const realDates=transactions.some(transaction=>Boolean(transaction.bookedAt));
  const currentTransactions=realDates?transactions.filter(transaction=>{const date=new Date(transaction.bookedAt!);return date.getMonth()===month&&date.getFullYear()===year}):transactions;
  const previousTransactions=transactions.filter(transaction=>{if(!transaction.bookedAt)return false;const date=new Date(transaction.bookedAt),previous=new Date(year,month-1,1);return date.getMonth()===previous.getMonth()&&date.getFullYear()===previous.getFullYear()});
  const income=currentTransactions.filter(transaction=>transaction.amount>0).reduce((sum,transaction)=>sum+(transaction.baseAmount??transaction.amount),0),expense=currentTransactions.filter(transaction=>transaction.amount<0).reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0);
  const previousExpense=previousTransactions.filter(transaction=>transaction.amount<0).reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0),difference=previousExpense?Math.round((expense-previousExpense)/previousExpense*100):0;
  const daysInMonth=new Date(year,month+1,0).getDate(),forecast=Math.round(expense/Math.max(1,now.getDate())*daysInMonth),projectedBalance=balance-Math.max(0,forecast-expense),monthLabel=new Intl.DateTimeFormat("uk-UA",{month:"long"}).format(now);
  const primaryGoal=goals[0]||{id:"demo-goal",name:"Резервний фонд",target:200000,current:120000,currency:"UAH",color:"#6558E8"},goalProgress=Math.min(100,Math.round(primaryGoal.current/Math.max(1,primaryGoal.target)*100));
  const symbol=currencySymbol(baseCurrency);
  return <><div className="summary-grid"><article className="balance-card"><div className="card-top"><span>Загальний баланс</span><button onClick={()=>openPage("Рахунки")}>{baseCurrency} <ChevronDown/></button></div><h2>{symbol} {formatMoney(balance)}<small>.00</small></h2><div className="balance-meta"><span><ArrowUpRight/> +{symbol} {formatMoney(income)} <small>доходи</small></span><span><ArrowDownLeft/> −{symbol} {formatMoney(expense)} <small>витрати</small></span></div><div className="balance-footer"><span>За {monthLabel}</span><span className={difference>0?"negative":"positive"}>{previousExpense?`${difference>0?"+":""}${difference}% до минулого місяця`:"Перший період"}</span></div></article>
    <article className="forecast-card"><div className="card-heading"><div><span>Прогноз на кінець місяця</span><h3>{symbol} {formatMoney(projectedBalance)}</h3></div><span className="forecast-icon"><Sparkles/></span></div><div className="forecast-line"><i style={{width:`${Math.min(100,now.getDate()/daysInMonth*100)}%`}}/><b/></div><p>За поточного темпу витрат · прогноз витрат {symbol} {formatMoney(forecast)}</p><div className="insight"><Sparkles/> {previousExpense?`Темп витрат ${Math.abs(difference)}% ${difference<=0?"нижчий":"вищий"} за минулий місяць`:"Прогноз уточнюється з кожною операцією"}</div></article></div>
    <section className="accounts"><div className="section-title"><div><h2>Мої рахунки</h2><p>Баланс усіх активів</p></div><button onClick={() => openPage("Рахунки")}>Усі рахунки <ArrowRight/></button></div><div className="account-row">{accounts.slice(0,3).map(a => <AccountCard key={a.id} account={a}/>) }<button className="new-account" onClick={addAccount}><Plus/><span>Додати рахунок</span></button></div></section>
    <div className="dashboard-grid"><section className="panel transactions"><div className="section-title"><div><h2>Останні операції</h2><p>Найновіші записи</p></div><button onClick={() => openPage("Операції")}>Усі операції <ArrowRight/></button></div><TransactionList transactions={transactions.slice(0,4)}/></section><section className="panel budget-panel"><div className="section-title"><div><h2>Бюджет: {monthLabel}</h2><p>{daysInMonth-now.getDate()} днів до кінця місяця</p></div><button onClick={() => openPage("Бюджет")}><MoreHorizontal/></button></div><div className="budget-total"><div><small>Витрачено цього місяця</small><strong>{symbol} {formatMoney(expense)}</strong></div><b>{forecast?Math.round(expense/forecast*100):0}% часу</b></div><div className="main-progress"><i style={{width:`${Math.min(100,now.getDate()/daysInMonth*100)}%`}}/></div><button className="budget-open" onClick={()=>openPage("Бюджет")}>Переглянути ліміти категорій <ArrowRight/></button></section></div>
    <button className="panel dashboard-goal" onClick={()=>openPage("Цілі")}><span className="goal-icon"><PiggyBank/></span><div><small>Головна фінансова ціль</small><strong>{primaryGoal.name}</strong><span><i style={{width:`${goalProgress}%`,background:primaryGoal.color}}/></span><p>{goalProgress}% · {primaryGoal.currency} {formatMoney(primaryGoal.current)} з {formatMoney(primaryGoal.target)}</p></div><ArrowRight/></button></>;
}

function TransactionsView({ transactions, search, setSearch, remove, exportCsv,exportExcel }: {transactions:Transaction[];search:string;setSearch:(s:string)=>void;remove:(id:number|string)=>void;exportCsv:()=>void;exportExcel:()=>void}) {
  const [account,setAccount]=useState("");const [category,setCategory]=useState("");const [owner,setOwner]=useState("");const [tag,setTag]=useState("");const [from,setFrom]=useState("");const [to,setTo]=useState("");
  const unique=(values:(string|undefined)[])=>Array.from(new Set(values.filter(Boolean) as string[])).sort();
  const shown=transactions.filter(t=>(!account||t.account===account)&&(!category||t.category===category)&&(!owner||t.owner===owner)&&(!tag||t.tags?.includes(tag))&&(!from||!t.bookedAt||t.bookedAt>=`${from}T00:00:00`)&&(!to||!t.bookedAt||t.bookedAt<=`${to}T23:59:59`));
  const clear=()=>{setAccount("");setCategory("");setOwner("");setTag("");setFrom("");setTo("");};
  return <section className="panel full-view"><div className="view-toolbar"><label className="search-box"><Search/><input placeholder="Пошук за назвою або категорією" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="secondary" onClick={clear}><X/> Очистити</button><button className="secondary" onClick={exportCsv}><Download/> CSV</button><button className="secondary" onClick={exportExcel}><Download/> Excel</button></div><div className="filter-grid"><label>Рахунок<select value={account} onChange={e=>setAccount(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.account)).map(v=><option key={v}>{v}</option>)}</select></label><label>Категорія<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.category)).map(v=><option key={v}>{v}</option>)}</select></label><label>Тег<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">Усі</option>{unique(transactions.flatMap(t=>t.tags||[])).map(v=><option key={v}>{v}</option>)}</select></label><label>Власник<select value={owner} onChange={e=>setOwner(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.owner)).map(v=><option key={v}>{v}</option>)}</select></label><label>Від<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>До<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div><div className="data-head"><span>Операція</span><span>Категорія</span><span>Дата</span><span>Сума</span><span/></div>{shown.map(t=><div className="data-row" key={t.id}><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}<small className="row-tags">{t.tags?.map(x=>`#${x}`).join(" ")}</small></strong><span>{t.category}<small>{t.account}{t.owner?` · ${t.owner}`:""}</small></span><span>{t.date}</span><b className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} {currencySymbol(t.currency||"UAH")} {formatMoney(t.amount)}</b><button className="icon-button danger" onClick={()=>remove(t.id)}><Trash2/></button></div>)}{shown.length===0&&<div className="empty">Нічого не знайдено</div>}</section>;
}
function BudgetView({budgets,transactions,add}:{budgets:BudgetItem[];transactions:Transaction[];add:()=>void}) { const active=budgets.length?budgets:budgetRows.map((b,i)=>({id:`d${i}`,categoryId:"",name:b.name,limit:b.limit,currency:"UAH",month:"2026-07-01",color:b.color}));const spentBy=transactions.filter(t=>t.amount<0).reduce<Record<string,number>>((a,t)=>{a[t.category]=(a[t.category]||0)+Math.abs(t.amount);return a;},{});const plan=active.reduce((s,b)=>s+b.limit,0);const spent=Object.values(spentBy).reduce((s,v)=>s+v,0);const day=Math.max(1,new Date().getDate());const days=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();const forecast=Math.round(spent/day*days);return <><div className="metric-grid"><article className="metric"><small>Місячний план</small><strong>₴ {formatMoney(plan)}</strong><span>{plan?Math.round(spent/plan*100):0}% використано</span></article><article className="metric"><small>Прогноз витрат</small><strong>₴ {formatMoney(forecast)}</strong><span className={forecast>plan?"negative":"positive"}>{forecast>plan?"Можливий перерозхід":"У межах плану"}</span></article><article className="metric"><small>Очікуваний залишок</small><strong>₴ {formatMoney(Math.max(0,plan-forecast))}</strong><span>За поточного темпу</span></article></div><section className="panel full-view"><div className="section-title"><div><h2>Ліміти за категоріями</h2><p>Поточний місяць</p></div><button className="small-primary" onClick={add}><Plus/> Додати ліміт</button></div><div className="large-budget"><div className="budget-list">{active.map(b=>{const used=spentBy[b.name]||0;const pct=Math.round(used/b.limit*100);return <div className="budget-item" key={b.id}><span className="budget-icon" style={{color:b.color,background:`${b.color}15`}}><Utensils/></span><div><div><strong>{b.name}</strong><small>₴ {formatMoney(used)} / {formatMoney(b.limit)} · {pct}%</small></div><span><i style={{width:`${Math.min(100,pct)}%`,background:pct>=100?"#e05252":pct>=80?"#f4b740":b.color}}/></span></div></div>})}</div></div>{active.some(b=>(spentBy[b.name]||0)/b.limit>=.8)&&<div className="alert-card"><Bell/><div><strong>Наближення до ліміту</strong><p>Одна або кілька категорій використані більш ніж на 80%.</p></div></div>}</section></>; }
function LiveBudgetView({budgets,transactions,period,baseCurrency,add}:{budgets:BudgetItem[];transactions:Transaction[];period:"month"|"week";baseCurrency:string;add:()=>void}){
  const [renderedAt]=useState(()=>Date.now()),now=new Date(renderedAt),weekStart=new Date(now);
  weekStart.setHours(0,0,0,0);
  weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const periodEnd=period==="week"?new Date(weekStart):new Date(now.getFullYear(),now.getMonth()+1,1);
  if(period==="week")periodEnd.setDate(periodEnd.getDate()+7);
  const periodKey=period==="week"?weekStart.toISOString().slice(0,10):`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const active=budgets.filter(budget=>budget.period===period&&(period==="week"?budget.month.slice(0,10)===periodKey:budget.month.startsWith(periodKey)));
  const periodTransactions=transactions.filter(transaction=>{
    if(!transaction.bookedAt)return true;
    const date=new Date(transaction.bookedAt),start=period==="week"?weekStart:new Date(now.getFullYear(),now.getMonth(),1);
    return date>=start&&date<periodEnd;
  });
  const spentBy=periodTransactions.filter(transaction=>transaction.amount<0).reduce<Record<string,number>>((sum,transaction)=>{
    sum[transaction.category]=(sum[transaction.category]||0)+Math.abs(transaction.baseAmount??transaction.amount);
    return sum;
  },{});
  const plan=active.reduce((sum,budget)=>sum+budget.limit,0),spent=Object.values(spentBy).reduce((sum,value)=>sum+value,0);
  const totalDays=period==="week"?7:new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const elapsedDays=period==="week"?Math.min(7,Math.floor((now.getTime()-weekStart.getTime())/86400000)+1):now.getDate();
  const forecast=Math.round(spent/Math.max(1,elapsedDays)*totalDays),periodLabel=period==="week"?"тиждень":"місяць";
  const planLabel=period==="week"?"Тижневий план":"Місячний план",symbol=currencySymbol(baseCurrency);
  return <>
    <div className="period-note"><Repeat2/> Формат планування: <strong>{period==="week"?"щотижня":"щомісяця"}</strong></div>
    <div className="metric-grid">
      <article className="metric"><small>{planLabel}</small><strong>{symbol} {formatMoney(plan)}</strong><span>{plan?Math.round(spent/plan*100):0}% використано</span></article>
      <article className="metric"><small>Прогноз витрат</small><strong>{symbol} {formatMoney(forecast)}</strong><span className={plan&&forecast>plan?"negative":"positive"}>{!plan?"Додайте перший ліміт":forecast>plan?"Можливий перерозхід":"У межах плану"}</span></article>
      <article className="metric"><small>Очікувана економія</small><strong>{symbol} {formatMoney(Math.max(0,plan-forecast))}</strong><span>За поточного темпу</span></article>
    </div>
    <section className="panel full-view">
      <div className="section-title"><div><h2>Ліміти за категоріями</h2><p>Поточний {periodLabel}</p></div><button className="small-primary" onClick={add}><Plus/> Додати ліміт</button></div>
      {active.length?<div className="large-budget"><div className="budget-list">{active.map(budget=>{
        const used=spentBy[budget.name]||0,percent=Math.round(used/budget.limit*100);
        return <div className="budget-item" key={budget.id}><span className="budget-icon" style={{color:budget.color,background:`${budget.color}15`}}><Utensils/></span><div><div><strong>{budget.name}</strong><small>{symbol} {formatMoney(used)} / {formatMoney(budget.limit)} · {percent}%</small></div><span><i style={{width:`${Math.min(100,percent)}%`,background:percent>=100?"#e05252":percent>=80?"#f4b740":budget.color}}/></span></div></div>;
      })}</div></div>:<div className="empty"><p>Лімітів на цей {periodLabel} ще немає.</p><button className="small-primary" onClick={add}><Plus/> Створити перший ліміт</button></div>}
      {active.some(budget=>(spentBy[budget.name]||0)/budget.limit>=.8)&&<div className="alert-card"><Bell/><div><strong>Наближення до ліміту</strong><p>Одна або кілька категорій використані більш ніж на 80%.</p></div></div>}
    </section>
  </>;
}
function AccountsView({accounts,rates,customRates,add,edit,addRate,transfer,remove}:{accounts:Account[];rates:{currency:string;rate:number;date:string}[];customRates:{currency:string;rate:number;date:string}[];add:()=>void;edit:(account:Account)=>void;addRate:()=>void;transfer:()=>void;remove:(id:number|string)=>void}) { const visible=rates.filter(r=>["USD","EUR"].includes(r.currency)); return <section className="panel full-view"><div className="section-title"><div><h2>Усі рахунки</h2><p>UAH, USD та інші валюти</p></div><div className="title-actions"><button className="secondary" onClick={transfer}><ArrowRight/> Переказ / обмін</button><button className="small-primary" onClick={add}><Plus/> Новий рахунок</button></div></div><div className="accounts-grid">{accounts.map(a=><div className="account-wrap" key={a.id}><AccountCard account={a}/><div className="account-actions"><button className="remove-account edit-account" onClick={()=>edit(a)}><Settings/> Редагувати</button><button className="remove-account" onClick={()=>remove(a.id)}><Trash2/> Видалити</button></div></div>)}</div><div className="rate-card"><Landmark/><div><strong>Офіційний курс НБУ</strong><p>{visible.length ? visible.map(r=>`${r.currency} ${r.rate.toFixed(4)}`).join(" · ") : "Оновлення курсів…"}{customRates.length?` · Власний: ${customRates.slice(0,3).map(r=>`${r.currency} ${r.rate}`).join(", ")}`:""}</p></div><button className="secondary" onClick={addRate}>Власний курс</button></div></section>; }
function GoalsView({goals,add,contribute,recurring,addRecurring}:{goals:GoalItem[];add:()=>void;contribute:(id:string,amount:number)=>void;recurring:RecurringItem[];addRecurring:()=>void}) { const shown=goals.length?goals:[{id:"demo1",name:"Резервний фонд",target:200000,current:120000,currency:"UAH",color:"#6558E8"},{id:"demo2",name:"Подорож до Японії",target:150000,current:38500,currency:"UAH",color:"#159B70"}]; return <><section className="panel full-view"><div className="section-title"><div><h2>Фінансові цілі</h2><p>Накопичення та великі покупки</p></div><button className="small-primary" onClick={add}><Plus/> Нова ціль</button></div><div className="goals-grid">{shown.map(g=>{const percent=Math.min(100,Math.round(g.current/g.target*100)),symbol=currencySymbol(g.currency);return <article className="goal-card" key={g.id}><span className="goal-icon"><PiggyBank/></span><small>{g.date?`До ${new Date(g.date).toLocaleDateString("uk-UA")}`:"Фінансова ціль"}</small><h3>{g.name}</h3><strong>{symbol} {formatMoney(g.current)} <span>з {formatMoney(g.target)}</span></strong><div><i style={{width:`${percent}%`,background:g.color}}/></div><p>{percent}% накопичено</p><button onClick={()=>contribute(g.id,1000)}>Поповнити на {symbol} 1 000</button></article>})}</div></section><section className="panel recurring-panel"><div className="section-title"><div><h2>Регулярні платежі</h2><p>Підписки, оренда та комунальні</p></div><button className="small-primary" onClick={addRecurring}><Plus/> Додати</button></div><div className="recurring-list">{recurring.length?recurring.map(r=><div key={r.id}><span className="recurring-icon"><Repeat2/></span><strong>{r.name}</strong><small>{r.frequency} · наступний {new Date(r.next).toLocaleDateString("uk-UA")}</small><b>{r.currency} {formatMoney(r.amount)}</b><em>{r.auto?"Автоматично":"Нагадування"}</em></div>):<p className="empty-inline">Регулярних платежів поки немає</p>}</div></section></>; }
function AnalyticsView({transactions,baseCurrency}:{transactions:Transaction[];baseCurrency:string}) {
  const [period,setPeriod]=useState<"month"|"week">("month"),[renderedAt]=useState(()=>Date.now()),now=new Date(renderedAt);
  const weekStart=(date:Date)=>{const result=new Date(date);result.setHours(0,0,0,0);result.setDate(result.getDate()-((result.getDay()+6)%7));return result};
  const buckets=period==="month"?Array.from({length:6},(_,index)=>{const start=new Date(now.getFullYear(),now.getMonth()-5+index,1),end=new Date(start.getFullYear(),start.getMonth()+1,1);return {key:start.toISOString(),start,end,label:new Intl.DateTimeFormat("uk-UA",{month:"short"}).format(start).replace(".",""),value:0}}):Array.from({length:8},(_,index)=>{const current=weekStart(now),start=new Date(current);start.setDate(start.getDate()-(7*(7-index)));const end=new Date(start);end.setDate(end.getDate()+7);return {key:start.toISOString(),start,end,label:`${start.getDate()}.${start.getMonth()+1}`,value:0}});
  const bucketFor=(transaction:Transaction)=>{if(!transaction.bookedAt)return buckets.at(-1);const date=new Date(transaction.bookedAt);return buckets.find(bucket=>date>=bucket.start&&date<bucket.end)};
  transactions.filter(transaction=>transaction.amount<0).forEach(transaction=>{const bucket=bucketFor(transaction);if(bucket)bucket.value+=Math.abs(transaction.baseAmount??transaction.amount)});
  const currentTransactions=transactions.filter(transaction=>bucketFor(transaction)===buckets.at(-1)),expenses=currentTransactions.filter(transaction=>transaction.amount<0);
  const total=expenses.reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0),income=currentTransactions.filter(transaction=>transaction.amount>0).reduce((sum,transaction)=>sum+(transaction.baseAmount??transaction.amount),0),impulsive=expenses.filter(transaction=>transaction.impulse).reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0);
  const grouped=Object.entries(expenses.reduce<Record<string,number>>((sum,transaction)=>{sum[transaction.category]=(sum[transaction.category]||0)+Math.abs(transaction.baseAmount??transaction.amount);return sum},{})).sort((a,b)=>b[1]-a[1]);
  const current=buckets.at(-1)?.value||0,previous=buckets.at(-2)?.value||0,delta=previous?Math.round((current-previous)/previous*100):0,maxValue=Math.max(...buckets.map(bucket=>bucket.value),1),symbol=currencySymbol(baseCurrency);
  return <><div className="period-switch"><button className={period==="month"?"active":""} onClick={()=>setPeriod("month")}>За місяцями</button><button className={period==="week"?"active":""} onClick={()=>setPeriod("week")}>За тижнями</button></div><div className="metric-grid"><article className="metric"><small>Витрати за {period==="month"?"місяць":"тиждень"}</small><strong>{symbol} {formatMoney(total)}</strong><span>Поточний період</span></article><article className="metric"><small>Доходи</small><strong>{symbol} {formatMoney(income)}</strong><span className="positive">Чистий потік {symbol} {formatMoney(income-total)}</span></article><article className="metric"><small>Імпульсивні покупки</small><strong>{symbol} {formatMoney(impulsive)}</strong><span>{total?Math.round(impulsive/total*100):0}% усіх витрат</span></article></div>
    <section className="panel monthly-panel"><div className="section-title"><div><h2>Динаміка витрат</h2><p>{period==="month"?"Останні шість місяців":"Останні вісім тижнів"}</p></div><span className={delta>0?"comparison negative":"comparison positive"}>{previous?`${delta>0?"+":""}${delta}% до попереднього періоду`:"Ще немає порівняння"}</span></div><div className="monthly-chart">{buckets.map(bucket=><div key={bucket.key}><strong>{bucket.value?`${symbol}${formatMoney(bucket.value)}`:"—"}</strong><span><i style={{height:`${Math.max(bucket.value?8:2,bucket.value/maxValue*100)}%`}}/></span><small>{bucket.label}</small></div>)}</div></section>
    <div className="analytics-grid"><section className="panel"><div className="section-title"><div><h2>Витрати за категоріями</h2><p>Розподіл поточного періоду</p></div></div><div className="category-chart">{grouped.length?grouped.map(([name,value],index)=><div key={name}><span style={{background:`hsl(${250-index*34} 72% ${58+index*3}%)`}}/><strong>{name}</strong><i><b style={{width:`${value/(grouped[0]?.[1]||1)*100}%`}}/></i><em>{Math.round(value/total*100)}%</em></div>):<p className="empty-inline">Додайте операції для аналітики</p>}</div></section><section className="panel impulse-report"><span className="goal-icon"><TrendingUp/></span><h2>Звіт про імпульсивні витрати</h2><strong>{expenses.filter(transaction=>transaction.impulse).length} покупок</strong><p>Позначайте незаплановані покупки під час створення операції. Rivna покаже їхню частку та вплив на план.</p><div className="donut" style={{"--percent":`${total?impulsive/total*100:0}%`} as React.CSSProperties}><span>{total?Math.round(impulsive/total*100):0}%</span></div></section></div></>;
}
function DebtsView({debts,add,settle}:{debts:DebtItem[];add:()=>void;settle:(id:string)=>void}) { const mine=debts.filter(d=>d.direction==="owed_to_me");const owe=debts.filter(d=>d.direction==="i_owe");return <section className="panel full-view"><div className="section-title"><div><h2>Борги та кредити</h2><p>Хто винен мені та кому винна я</p></div><button className="small-primary" onClick={add}><Plus/> Додати борг</button></div><div className="debt-summary"><article><ArrowDownLeft/><div><small>Мені винні</small><strong>₴ {formatMoney(mine.reduce((s,d)=>s+d.amount,0))}</strong></div></article><article><ArrowUpRight/><div><small>Я винна</small><strong>₴ {formatMoney(owe.reduce((s,d)=>s+d.amount,0))}</strong></div></article></div><div className="debt-list">{debts.map(d=><div key={d.id}><span className={d.direction==="owed_to_me"?"debt-in":"debt-out"}>{d.direction==="owed_to_me"?<ArrowDownLeft/>:<ArrowUpRight/>}</span><div><strong>{d.person}</strong><small>{d.note||"Без нотатки"}{d.due?` · до ${new Date(d.due).toLocaleDateString("uk-UA")}`:""}</small></div><b>{d.currency} {formatMoney(d.amount)}</b><button onClick={()=>settle(d.id)}>Закрити</button></div>)}{!debts.length&&<p className="empty">Активних боргів немає</p>}</div></section>; }
function SettingsView({dark,setDark,logout,notify,importCsv,categories,audit,addCategory,deleteCategory,pushEnabled,enablePush,installApp}:{dark:boolean;setDark:(v:boolean)=>void;logout:()=>void;notify:(s:string)=>void;importCsv:(file:File)=>void;categories:CategoryItem[];audit:AuditItem[];addCategory:()=>void;deleteCategory:(id:string)=>void;pushEnabled:boolean;enablePush:()=>void;installApp:()=>void}) {
  return <><div className="settings-grid"><ProfileSettings dark={dark} setDark={setDark} notify={notify}/><section className="panel settings-card"><h2>Застосунок та інтеграції</h2><button className="integration" onClick={installApp}><Download/><span><strong>Встановити Rivna</strong><small>На домашній екран iOS, Android або ПК</small></span><ArrowRight/></button><button className="integration" onClick={enablePush}><Bell/><span><strong>{pushEnabled?"Сповіщення увімкнено":"Увімкнути сповіщення"}</strong><small>Алерти 80% і 100% бюджету</small></span><ArrowRight/></button><label className="integration file-integration"><Upload/><span><strong>Імпорт даних</strong><small>CSV до 5 МБ</small></span><ArrowRight/><input type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)importCsv(file);event.target.value=""}}/></label><button className="integration" onClick={()=>notify("Telegram chat ID зберігається у блоці «Загальні»")}><Goal/><span><strong>Telegram-бот</strong><small>Команда: 300 кава #робота</small></span><ArrowRight/></button><button className="logout" onClick={logout}>Вийти з акаунта</button></section></div>
    <div className="settings-lower"><section className="panel"><div className="section-title"><div><h2>Категорії</h2><p>Власні назви, кольори та Lucide-іконки</p></div><button className="small-primary" onClick={addCategory}><Plus/> Категорія</button></div><div className="category-manager">{categories.map(category=><div key={category.id}><span style={{background:category.color}}/><strong>{category.name}</strong><small>{category.kind==="income"?"Дохід":"Витрата"}</small><button onClick={()=>deleteCategory(category.id)}><Trash2/></button></div>)}</div></section><section className="panel"><div className="section-title"><div><h2>Історія змін</h2><p>Останні ключові дії</p></div></div><div className="audit-list">{audit.slice(0,12).map(item=><div key={item.id}><span>{item.action==="insert"?"+":item.action==="delete"?"−":"↻"}</span><div><strong>{translateEntity(item.entity)}</strong><small>{translateAction(item.action)} · {new Date(item.created).toLocaleString("uk-UA")}</small></div></div>)}{!audit.length&&<p className="empty-inline">Історія з’явиться після змін у Supabase</p>}</div></section></div></>
}

type SettingsProfile={name:string;email:string;baseCurrency:string;planningPeriod:"month"|"week";householdName:string;telegramChatId:string;recurringReminders:boolean;budget80:boolean;budget100:boolean;role:string};
function ProfileSettings({dark,setDark,notify}:{dark:boolean;setDark:(value:boolean)=>void;notify:(message:string)=>void}){
  const [profile,setProfile]=useState<SettingsProfile|null>({name:"Марія",email:"",baseCurrency:"UAH",planningPeriod:"month",householdName:"Мої фінанси",telegramChatId:"",recurringReminders:true,budget80:true,budget100:true,role:"owner"});
  useEffect(()=>{fetch("/api/settings",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>data?.profile&&setProfile(data.profile)).catch(()=>{})},[]);
  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(!profile)return;
    const response=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"saveProfile",...profile})});
    const result=await response.json();
    notify(response.ok?"Налаштування збережено":result.error||"Не вдалося зберегти");
    if(response.ok)window.setTimeout(()=>window.location.reload(),500);
  }
  return <form className="panel settings-card" onSubmit={save}>
    <h2>Загальні</h2>
    <label>Ваше ім’я<input value={profile?.name||""} onChange={e=>setProfile(p=>p?{...p,name:e.target.value}:p)} placeholder="Ваше ім’я"/></label>
    <label>Базова валюта<select value={profile?.baseCurrency||"UAH"} disabled={!["owner","admin"].includes(profile?.role||"")} onChange={e=>setProfile(p=>p?{...p,baseCurrency:e.target.value}:p)}><option>UAH</option><option>USD</option><option>EUR</option><option>GBP</option><option>PLN</option></select></label>
    <label>Період планування<select value={profile?.planningPeriod||"month"} onChange={e=>setProfile(p=>p?{...p,planningPeriod:e.target.value==="week"?"week":"month"}:p)}><option value="month">Місяць</option><option value="week">Тиждень</option></select></label>
    <label>Telegram chat ID<input value={profile?.telegramChatId||""} onChange={e=>setProfile(p=>p?{...p,telegramChatId:e.target.value}:p)} placeholder="Надішліть боту /start"/></label>
    <label className="setting-toggle"><span><strong>Алерт на 80%</strong><small>Попередження про наближення до ліміту</small></span><input type="checkbox" checked={profile?.budget80??true} onChange={e=>setProfile(p=>p?{...p,budget80:e.target.checked}:p)}/></label>
    <label className="setting-toggle"><span><strong>Алерт на 100%</strong><small>Повідомлення про вичерпаний ліміт</small></span><input type="checkbox" checked={profile?.budget100??true} onChange={e=>setProfile(p=>p?{...p,budget100:e.target.checked}:p)}/></label>
    <label className="setting-toggle"><span><strong>Нагадування про платежі</strong><small>Для неавтоматичних правил</small></span><input type="checkbox" checked={profile?.recurringReminders??true} onChange={e=>setProfile(p=>p?{...p,recurringReminders:e.target.checked}:p)}/></label>
    <label className="setting-toggle"><span><strong>Темна тема</strong><small>Змінити вигляд застосунку</small></span><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/></label>
    <button className="primary" disabled={!profile}>Зберегти</button>
  </form>;
}
type SharedMember={userId:string;name:string;role:string;joinedAt:string;isMe:boolean};
type PendingInvite={id:string;email?:string;username?:string;role:string;expires_at:string};
type FinanceSpace={id:string;name:string;currency:string;role:string;active:boolean};
function MembersPanel({notify}:{notify:(message:string)=>void}){
  const [members,setMembers]=useState<SharedMember[]>([]),[invites,setInvites]=useState<PendingInvite[]>([]),[spaces,setSpaces]=useState<FinanceSpace[]>([]),[myRole,setMyRole]=useState("");
  async function load(){const response=await fetch("/api/settings",{cache:"no-store"});if(!response.ok)return;const data=await response.json();setMembers(data.members||[]);setInvites(data.invitations||[]);setSpaces(data.spaces||[]);setMyRole(data.profile?.role||"");}
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[]);
  async function action(payload:Record<string,unknown>){const response=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const result=await response.json();notify(response.ok?"Доступ оновлено":result.error||"Помилка");if(response.ok)await load();}
  async function switchSpace(householdId:string){const response=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"switchHousehold",householdId})});const result=await response.json();if(!response.ok)return notify(result.error||"Не вдалося перемкнути бюджет");notify("Бюджет перемкнено");window.location.reload()}
  const canManage=["owner","admin"].includes(myRole);
  return <section className="panel members-panel"><div className="section-title"><div><h2>Доступи до бюджету</h2><p>Спільні простори, ролі та учасники</p></div><span className="role-badge">{translateRole(myRole)}</span></div>{spaces.length>1&&<div className="space-switcher">{spaces.map(space=><button key={space.id} className={space.active?"active":""} onClick={()=>!space.active&&switchSpace(space.id)}><span className="member-avatar"><WalletCards/></span><span><strong>{space.name}</strong><small>{space.currency} · {translateRole(space.role)}</small></span>{space.active&&<Check/>}</button>)}</div>}<div className="member-list">{members.map(member=><div key={member.userId}><span className="member-avatar">{member.name.slice(0,2).toUpperCase()}</span><div><strong>{member.name}{member.isMe?" · ви":""}</strong><small>З {new Date(member.joinedAt).toLocaleDateString("uk-UA")}</small></div>{canManage&&!member.isMe&&member.role!=="owner"?<><select value={member.role} onChange={e=>action({action:"changeRole",userId:member.userId,role:e.target.value})}><option value="admin">Адміністратор</option><option value="member">Учасник</option><option value="viewer">Глядач</option></select><button className="icon-button" onClick={()=>action({action:"removeMember",userId:member.userId})} aria-label="Видалити учасника"><Trash2/></button></>:<span className="member-role">{translateRole(member.role)}</span>}</div>)}</div>{invites.length>0&&<div className="pending-invites"><strong>Очікують приєднання</strong>{invites.map(invite=><div key={invite.id}><span>{invite.email||`@${invite.username}`}</span><small>{translateRole(invite.role)} · до {new Date(invite.expires_at).toLocaleDateString("uk-UA")}</small>{canManage&&<button onClick={()=>action({action:"cancelInvite",id:invite.id})}>Скасувати</button>}</div>)}</div>}</section>;
}
function translateRole(role:string){return role==="owner"?"Власник":role==="admin"?"Адміністратор":role==="viewer"?"Глядач":role==="member"?"Учасник":"—"}
function GuideFeedback({notify,authenticated}:{notify:(message:string)=>void;authenticated:boolean}){
  const [rating,setRating]=useState(5),[message,setMessage]=useState(""),[sending,setSending]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();if(!authenticated)return notify("Відгук можна надіслати після входу");setSending(true);const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating,message})});const result=await response.json();setSending(false);if(response.ok){setMessage("");notify("Дякуємо за відгук")}else notify(result.error||"Не вдалося надіслати")}
  return <section className="guide-grid"><div className="panel guide-card"><div className="section-title"><div><h2>Короткий довідник</h2><p>Як швидко почати роботу з Rivna</p></div></div><ol><li><span>1</span><div><strong>Додайте рахунки</strong><small>Картки, готівку та валютні заощадження.</small></div></li><li><span>2</span><div><strong>Записуйте витрати</strong><small>Теги, поділ чека та повторення доступні в одній формі.</small></div></li><li><span>3</span><div><strong>Встановіть ліміти</strong><small>Rivna попередить на 80% та 100% бюджету.</small></div></li><li><span>4</span><div><strong>Підключіть Telegram</strong><small>Збережіть chat ID і пишіть боту: «300 кава».</small></div></li></ol></div><form className="panel feedback-card" onSubmit={submit}><span className="wizard-icon"><Sparkles/></span><h2>Допоможіть зробити Rivna кращою</h2><p>Що зручно, а що варто змінити?</p><div className="rating-row">{[1,2,3,4,5].map(value=><button type="button" key={value} className={value<=rating?"active":""} onClick={()=>setRating(value)}>★</button>)}</div><textarea value={message} onChange={event=>setMessage(event.target.value)} placeholder="Ваш відгук…" required minLength={3}/><button className="primary" disabled={sending}>{sending?"Надсилаємо…":"Надіслати відгук"}</button></form></section>
}

function AccountCard({account}:{account:Account}) { const [renderedAt]=useState(()=>Date.now()),days=account.graceEnd?Math.ceil((new Date(account.graceEnd).getTime()-renderedAt)/86400000):null;return <article className={`account ${bankStyle(account.bank)}`} style={account.color?{background:account.color}:undefined}><div><BankMark bank={account.bank}/>{days!==null&&<em className={days<=7?"grace urgent":"grace"}>{days>=0?`${days} дн. грейсу`:"Грейс минув"}</em>}</div><p>{account.name}</p><h3>{currencySymbol(account.currency)} {formatMoney(account.balance)}</h3><small>{account.bank} · {account.owner}{account.creditLimit?` · ліміт ${formatMoney(account.creditLimit)}`:""}</small></article>; }
function BankMark({bank}:{bank:string}){const value=bank.toLowerCase();if(value.includes("mono"))return <span className="bank-logo mono-logo">mono</span>;if(value.includes("приват")||value.includes("privat"))return <span className="bank-logo privat-logo">П</span>;if(value.includes("пумб")||value.includes("pumb"))return <span className="bank-logo pumb-logo">ПУМБ</span>;if(value.includes("ощад"))return <span className="bank-logo oschad-logo">О</span>;if(value.includes("готів"))return <span className="bank-icon"><Landmark/></span>;return <span className="bank-icon">{bank.slice(0,1).toUpperCase()||<CreditCard/>}</span>}
function bankStyle(bank:string,index=2){const value=bank.toLowerCase();if(value.includes("mono"))return "mono";if(value.includes("приват")||value.includes("privat"))return "privat";if(value.includes("пумб")||value.includes("pumb"))return "pumb";if(value.includes("ощад"))return "oschad";return index%3===0?"mono":index%3===1?"privat":"stash"}
function TransactionList({transactions}:{transactions:Transaction[]}) { return <div className="tx-list">{transactions.map(t=><div className="tx" key={t.id}><span className={`tx-icon ${t.amount>0?"income":"shop"}`}>{t.amount>0?<ArrowDownLeft/>:<ShoppingBag/>}</span><div className="tx-info"><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}</strong><small>{t.category} · {t.date}</small></div><strong className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} {currencySymbol(t.currency||"UAH")} {formatMoney(t.amount)}</strong></div>)}</div>; }
function ExpenseModal({amount,setAmount,note,setNote,accounts,categories,submit,close}:{amount:string;setAmount:(s:string)=>void;note:string;setNote:(s:string)=>void;accounts:Account[];categories:CategoryItem[];submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [type,setType]=useState<"expense"|"income">("expense"),[accountId,setAccountId]=useState(String(accounts[0]?.id||"")),[categoryId,setCategoryId]=useState("");
  const account=accounts.find(item=>String(item.id)===accountId)||accounts[0];
  const accountOptions=accounts.map(item=>({value:String(item.id),label:`${item.name} · ${item.currency}`}));
  const categoryOptions=[{value:"",label:"Без категорії"},...categories.filter(category=>category.kind===type).map(category=>({value:category.id,label:category.name}))];
  function changeType(next:"expense"|"income"){setType(next);setCategoryId("")}
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal tall-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}>
    <ModalHead label="Деталізація операції" title={type==="income"?"Новий дохід":"Нова витрата"} close={close}/>
    <div className="operation-type"><button type="button" className={type==="expense"?"active":""} onClick={()=>changeType("expense")}><ArrowUpRight/> Витрата</button><button type="button" className={type==="income"?"active":""} onClick={()=>changeType("income")}><ArrowDownLeft/> Дохід</button></div>
    <input type="hidden" name="type" value={type}/>
    <label className="amount-field"><span>{currencySymbol(account?.currency||"UAH")}</span><input autoFocus required inputMode="decimal" placeholder="0" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
    <div className="form-two"><WheelField name="account" label="Рахунок" options={accountOptions} value={accountId} onChange={setAccountId}/><WheelField name="category" label="Категорія" options={categoryOptions} value={categoryId} onChange={setCategoryId}/></div>
    <label>Валюта<input name="currency" value={account?.currency||"UAH"} readOnly/></label>
    <DateWheelField name="date"/>
    <label>Нотатка<input placeholder={type==="income"?"Наприклад, зарплата":"Наприклад, кава"} value={note} onChange={event=>setNote(event.target.value)}/></label>
    <label>Теги<input name="tags" placeholder="#відпустка #робота"/></label>
    {type==="expense"&&<><details className="split-details"><summary>Розділити чек</summary><div className="form-two"><label>Загальна сума<input name="splitTotal" type="number" min="0" step=".01"/></label><label>Моя частка<input name="personalShare" type="number" min="0" step=".01"/></label></div><label>Учасники<input name="splitParticipants" placeholder="Діма, Оля, Андрій"/></label><small className="field-help">Залишок буде порівну розподілений між учасниками, а з балансу спишеться лише ваша частка.</small></details><details className="split-details"><summary>Повторювати витрату</summary><label className="check impulse"><input name="repeat" type="checkbox"/> Створити регулярне нагадування</label><div className="form-two"><label>Період<select name="repeatFrequency"><option value="weekly">Щотижня</option><option value="monthly">Щомісяця</option><option value="yearly">Щороку</option></select></label><label>Число місяця<input name="repeatDay" type="number" min="1" max="28" placeholder="Наприклад, 5"/></label></div></details><label className="check impulse"><input name="impulse" type="checkbox"/> Імпульсивна витрата</label></>}
    <button className="primary">{type==="income"?"Додати дохід":"Додати витрату"}</button>
  </form></div>;
}
function WheelField({name,label,options,value:controlled,onChange,defaultValue}:{name:string;label:string;options:{value:string;label:string}[];value?:string;onChange?:(value:string)=>void;defaultValue?:string}){const [internal,setInternal]=useState(defaultValue??options[0]?.value??""),value=controlled===undefined?internal:controlled,selected=options.find(option=>option.value===value);function select(next:string){if(controlled===undefined)setInternal(next);onChange?.(next)}return <label className="picker-label">{label}<details className="compact-picker"><summary>{selected?.label||"Оберіть"}</summary><div className="picker-wheel">{options.map(option=><button type="button" key={`${name}-${option.value}`} className={option.value===value?"selected":""} onClick={event=>{select(option.value);event.currentTarget.closest("details")?.removeAttribute("open")}}>{option.label}{option.value===value&&<Check/>}</button>)}</div></details><input type="hidden" name={name} value={value}/></label>}
function DateWheelField({name}:{name:string}){const [renderedAt]=useState(()=>Date.now()),options=Array.from({length:38},(_,index)=>{const date=new Date(renderedAt);date.setDate(date.getDate()+index-7);const value=date.toISOString().slice(0,10);return {value,label:new Intl.DateTimeFormat("uk-UA",{weekday:"short",day:"numeric",month:"long"}).format(date)}});return <WheelField name={name} label="Дата" options={options} defaultValue={options[7]?.value}/>}
function AccountModal({account,submit,close}:{account:Account|null;submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { const banks=["monobank","ПриватБанк","ПУМБ","Ощадбанк","Райффайзен Банк","Готівка","Інший"],selected=banks.includes(account?.bank||"")?account?.bank:"Інший";return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label={account?"Редагування активу":"Новий актив"} title={account?"Змінити рахунок":"Додати рахунок"} close={close}/><label>Назва<input name="name" defaultValue={account?.name} placeholder="Наприклад, Зарплатна картка" required/></label><div className="form-two"><label>Банк<select name="bank" defaultValue={selected}>{banks.map(bank=><option key={bank}>{bank}</option>)}</select></label><label>Власник<input name="owner" defaultValue={account?.owner} placeholder="Мій"/></label></div><div className="form-two"><label>Валюта<select name="currency" defaultValue={account?.currency||"UAH"}><option>UAH</option><option>USD</option><option>EUR</option><option>GBP</option><option>PLN</option></select></label><label>Баланс<input name="balance" type="number" step=".01" defaultValue={account?.balance} placeholder="0"/></label></div><label>Колір картки<input name="cardColor" type="color" defaultValue={account?.color||"#252629"}/></label><details className="split-details" open={Boolean(account?.creditLimit||account?.graceEnd)}><summary>Кредитна картка</summary><div className="form-two"><label>Кредитний ліміт<input name="creditLimit" type="number" min="0" defaultValue={account?.creditLimit} placeholder="0"/></label><label>Кінець грейс-періоду<input name="graceEnd" type="date" defaultValue={account?.graceEnd?.slice(0,10)}/></label></div></details><button className="primary">{account?"Зберегти зміни":"Створити рахунок"}</button></form></div>; }
function GoalModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Накопичення" title="Нова фінансова ціль" close={close}/><label>Назва<input name="name" required placeholder="Резервний фонд"/></label><div className="form-two"><label>Цільова сума<input name="target" type="number" min="1" required/></label><label>Вже накопичено<input name="current" type="number" min="0" defaultValue="0"/></label></div><div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Цільова дата<input name="date" type="date"/></label></div><button className="primary">Створити ціль</button></form></div>; }
function DebtModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Облік зобов’язань" title="Новий борг" close={close}/><label>Людина або організація<input name="person" required placeholder="Олексій"/></label><div className="form-two"><label>Напрям<select name="direction"><option value="owed_to_me">Мені винні</option><option value="i_owe">Я винна</option></select></label><label>Сума<input name="amount" type="number" min="1" required/></label></div><div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Повернути до<input name="date" type="date"/></label></div><label>Нотатка<input name="note" placeholder="За квитки"/></label><button className="primary">Додати борг</button></form></div>; }
function RecurringModal({accounts,categories,submit,close}:{accounts:Account[];categories:CategoryItem[];submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Автоматизація" title="Регулярний платіж" close={close}/><label>Назва<input name="name" required placeholder="Netflix"/></label><div className="form-two"><label>Рахунок<select name="account" required>{accounts.map(account=><option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label><label>Категорія<select name="category"><option value="">Без категорії</option>{categories.filter(category=>category.kind==="expense").map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><div className="form-two"><label>Сума<input name="amount" type="number" min=".01" step=".01" required/></label><label>Період<select name="frequency"><option value="monthly">Щомісяця</option><option value="weekly">Щотижня</option><option value="yearly">Щороку</option></select></label></div><label>Наступна дата<input name="date" type="datetime-local" required/></label><label className="check impulse"><input name="auto" type="checkbox"/> Створювати операцію автоматично</label><button className="primary">Зберегти платіж</button></form></div>; }
function TransferModal({accounts,submit,close}:{accounts:Account[];submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Між власними рахунками" title="Переказ або обмін" close={close}/><div className="form-two"><label>З рахунку<select name="from" required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label><label>На рахунок<select name="to" required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label></div><div className="form-two"><label>Сума списання<input name="sent" type="number" min=".01" step=".01" required/></label><label>Сума зарахування<input name="received" type="number" min=".01" step=".01" required/></label></div><div className="form-two"><label>Курс обміну<input name="rate" type="number" min=".000001" step=".000001" defaultValue="1"/></label><label>Комісія<input name="fee" type="number" min="0" step=".01" defaultValue="0"/></label></div><label>Валюта комісії<select name="feeCurrency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Нотатка<input name="note" placeholder="Обмін на відпустку"/></label><button className="primary">Виконати переказ</button></form></div>; }
function BudgetModal({categories,period,baseCurrency,submit,close}:{categories:CategoryItem[];period:"month"|"week";baseCurrency:string;submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { const now=new Date(),weekStart=new Date(now);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));const value=period==="week"?weekStart.toISOString().slice(0,10):`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Планування" title="Ліміт категорії" close={close}/><label>Категорія<select name="category" required>{categories.filter(c=>c.kind==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="form-two"><label>{period==="week"?"Перший день тижня":"Місяць"}<input name="period" type={period==="week"?"date":"month"} defaultValue={value} required/></label><label>Ліміт, {baseCurrency}<input name="limit" type="number" min="1" required/></label></div><button className="primary">Зберегти ліміт</button></form></div>; }
function CategoryModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Персоналізація" title="Нова категорія" close={close}/><label>Назва<input name="name" required placeholder="Домашні улюбленці"/></label><div className="form-two"><label>Тип<select name="kind"><option value="expense">Витрата</option><option value="income">Дохід</option></select></label><label>Lucide-іконка<select name="icon"><option>CircleDollarSign</option><option>ShoppingBag</option><option>Utensils</option><option>Car</option><option>House</option><option>HeartPulse</option><option>Sparkles</option></select></label></div><label>Колір<input name="color" type="color" defaultValue="#6558e8"/></label><button className="primary">Створити категорію</button></form></div>; }
function InviteModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Спільне планування" title="Запросити учасника" close={close}/><label>Email або username<input name="identifier" required placeholder="partner@example.com або @partner"/></label><label>Роль<select name="role"><option value="member">Учасник — може редагувати фінанси</option><option value="viewer">Глядач — лише перегляд</option><option value="admin">Адміністратор — може запрошувати</option></select></label><div className="form-message success">Email-запрошення буде надіслано автоматично. Одноразове посилання також діятиме 7 днів і скопіюється в буфер.</div><button className="primary">Надіслати запрошення</button></form></div>; }
function CustomRateModal({submit,close}:{submit:(e:React.FormEvent<HTMLFormElement>)=>void;close:()=>void}){return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><ModalHead label="Готівковий або власний курс" title="Додати курс валюти" close={close}/><div className="form-two"><label>Валюта<select name="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>PLN</option></select></label><label>Курс до UAH<input name="rate" type="number" min=".000001" step=".000001" required/></label></div><label>Дата<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required/></label><button className="primary">Зберегти власний курс</button></form></div>}
function ModalHead({label,title,close}:{label:string;title:string;close:()=>void}) { return <div className="modal-head"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><button type="button" onClick={close}><X/></button></div>; }
function exportCsv(items:Transaction[],notify:(s:string)=>void) { const csv=["Назва,Категорія,Дата,Сума,Валюта",...items.map(t=>`"${t.title}","${t.category}","${t.bookedAt||t.date}",${t.amount},${t.currency||"UAH"}`)].join("\n"); const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download="rivna-transactions.csv";a.click();URL.revokeObjectURL(url);notify("CSV-файл завантажено"); }
async function exportExcel(items:Transaction[],notify:(s:string)=>void){const XLSX=await import("xlsx");const rows=items.map(t=>({Назва:t.title,Категорія:t.category,Дата:t.bookedAt||t.date,Сума:t.amount,Валюта:t.currency||"UAH",Рахунок:t.account||"",Власник:t.owner||"",Теги:(t.tags||[]).map(tag=>`#${tag}`).join(" "),Імпульсивна:t.impulse?"Так":"Ні"}));const sheet=XLSX.utils.json_to_sheet(rows),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,"Операції");XLSX.writeFile(book,"rivna-transactions.xlsx");notify("Excel-файл завантажено")}
function translateEntity(value:string){return ({transactions:"Операція",accounts:"Рахунок",transfers:"Переказ",budgets:"Бюджет"} as Record<string,string>)[value]||value}
function translateAction(value:string){return ({insert:"створено",update:"змінено",delete:"видалено"} as Record<string,string>)[value]||value}
