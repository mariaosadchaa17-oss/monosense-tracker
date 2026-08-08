"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, Check,
  ChevronDown, CircleDollarSign, CreditCard, Download, Eye, EyeOff,
  Fingerprint, Goal, Home, Landmark, Moon, MoreHorizontal, PiggyBank, Plus,
  Search, Settings, ShoppingBag, Sparkles, Sun, Target, Trash2,
  Upload, Utensils, WalletCards, X, PieChart, HandCoins, Repeat2,
  ShoppingCart, Coffee, Bus, House, HeartPulse, Gamepad2, Car, Fuel,
  Shirt, Plane, Dumbbell, Wifi, GraduationCap, Gift, PawPrint, Smartphone, Wallet,
  Music, BookOpen, Baby, Palette, Bike, Train, Stethoscope, Cat
} from "lucide-react";
import {PasskeyButton} from "./components/passkey-button";
const APP_VERSION = "2026.08.06-2";

// Фиксированный набор иконок для лимитов — вынесен в конфиг, чтобы можно было
// расширять без правки логики компонентов.
const BUDGET_ICONS: Record<string, React.ComponentType<{size?:number}>> = {
  CircleDollarSign, ShoppingCart, ShoppingBag, Coffee, Bus, Car, Fuel, House, HeartPulse,
  Gamepad2, Shirt, Plane, Dumbbell, Wifi, GraduationCap, Gift, PawPrint, Smartphone, Wallet, Utensils,
  Sparkles, Music, BookOpen, Baby, Palette, Bike, Train, Stethoscope, Cat,
};
const BUDGET_ICON_NAMES = Object.keys(BUDGET_ICONS);
function BudgetIcon({name, size}: {name?: string; size?: number}) {
  const Icon = (name && BUDGET_ICONS[name]) || CircleDollarSign;
  return <Icon size={size}/>;
}
// Фиксированная палитра — цвета подобраны так, чтобы хорошо смотреться с
// текущим интерфейсом (тот же тон насыщенности, что и у акцентного цвета) і
// давать достаточний контраст текста при використанні як фон іконки (15% alpha).
const BUDGET_COLORS = ["#6558e8","#ff7a66","#f0a94a","#28a879","#4c91e8","#e874a6","#8875d1","#42a7a2","#d3a032","#66717d"];

type Page = "Головна" | "Операції" | "Бюджет" | "Рахунки" | "Накопичення" | "Аналітика" | "Борги" | "Налаштування";
type Transaction = { id: number | string; title: string; category: string;categoryIcon?:string; date: string; bookedAt?:string; account?:string; owner?:string; tags?:string[]; amount: number;currency?:string;baseAmount?:number; impulse?: boolean; kind?:string };
type Account = { id: number | string; name: string; bank: string; owner: string; currency: string; balance: number; style: string;color?:string;creditLimit?:number;graceEnd?:string;cardImage?:string };
type GoalItem = {id:string;name:string;target:number;current:number;currency:string;date?:string;color:string;assetType?:string;annualRate?:number;compoundInterest?:boolean;roundBalanceTo?:number;roundExpenseTo?:number;expensePercent?:number;sourceAccountId?:string};
type DebtItem = {id:string;person:string;direction:"owed_to_me"|"i_owe";amount:number;currency:string;due?:string;note?:string;isVirtual?:boolean;accountId?:string;isInstallment?:boolean;installmentMonths?:number};
type RecurringItem = {id:string;name:string;amount:number;currency:string;frequency:string;next:string;auto:boolean;kind:"expense"|"income"};
type CategoryItem = {id:string;name:string;kind:string;color:string;icon:string;isDefault?:boolean};
type BudgetItem = {id:string;categoryId:string;name:string;icon:string;limit:number;currency:string;month:string;period:"month"|"week";color:string};
type RuleItem={id:string;name:string;conditionType:string;conditionValue:string;actionType:string;actionCategoryId?:string;actionGoalId?:string;actionValue?:number};
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
function toDateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
type OfflineQueueItem={id:string;payload:Record<string,unknown>;createdAt:number};
function getOfflineQueue():OfflineQueueItem[]{
  if(typeof window==="undefined")return [];
  try{return JSON.parse(localStorage.getItem("rivna-offline-queue")||"[]");}catch{return [];}
}
function saveOfflineQueue(queue:OfflineQueueItem[]){
  localStorage.setItem("rivna-offline-queue",JSON.stringify(queue));
}
function addToOfflineQueue(payload:Record<string,unknown>){
  const queue=getOfflineQueue();
  queue.push({id:`offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,payload,createdAt:Date.now()});
  saveOfflineQueue(queue);
}
function evaluateExpression(input:string):number|null{
  const trimmed=input.trim();
  if(!trimmed||!/^[0-9+\-*/.,\s()]+$/.test(trimmed))return null;
  if(!/[+\-*/]/.test(trimmed))return null;
  try{
    const normalized=trimmed.replace(/,/g,".");
    const result=Function(`"use strict";return(${normalized})`)();
    if(typeof result==="number"&&Number.isFinite(result)&&result>0)return Math.round(result*100)/100;
    return null;
  }catch{return null;}
}
function budgetPeriodBounds(periodType:"month"|"week",anchorIso:string){
  const anchor=new Date(`${anchorIso}T00:00:00`);
  if(periodType==="week"){
    const weekIndex=Math.floor((anchor.getDate()-1)/7);
    const periodStart=new Date(anchor.getFullYear(),anchor.getMonth(),weekIndex*7+1);
    const nextMonthStart=new Date(anchor.getFullYear(),anchor.getMonth()+1,1);
    const naturalEnd=new Date(anchor.getFullYear(),anchor.getMonth(),weekIndex*7+8);
    const periodEnd=naturalEnd<nextMonthStart?naturalEnd:nextMonthStart;
    return {periodStart,periodEnd};
  }
  const periodStart=new Date(anchor.getFullYear(),anchor.getMonth(),1);
  const periodEnd=new Date(anchor.getFullYear(),anchor.getMonth()+1,1);
  return {periodStart,periodEnd};
}
const isLight = (hex: string | undefined) => {
  if (typeof hex !== 'string' || hex.length < 7) return false; // Ensure hex is a string before accessing length or slice
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

export function RivnaApp({ initialLoggedIn = false }: { initialLoggedIn?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage] = useState<Page>("Головна");
  const [dark, setDark] = useState(()=>typeof window!=="undefined"&&localStorage.getItem("rivna-theme")==="dark");
  const [skin, setSkin] = useState(()=>typeof window!=="undefined"?localStorage.getItem("rivna-skin")||"default":"default");
  const [cardStyle, setCardStyle] = useState(()=>typeof window!=="undefined"?localStorage.getItem("rivna-cardstyle")||"default":"default");
  const [modal, setModal] = useState<"expense" | "account" | "goal" | "debt" | "recurring" | "transfer" | "budget" | "category" | "invite" | "rate" | "split" | "purchase-sim" | "wrapped" | "rule" | null>(null);
  const [transactions, setTransactions] = useState(initialLoggedIn?[]:seedTransactions);
  const [accounts, setAccounts] = useState(initialLoggedIn?[]:seedAccounts);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [rates, setRates] = useState<{currency:string;rate:number;date:string}[]>([]);
  const [customRates,setCustomRates]=useState<{currency:string;rate:number;date:string}[]>([]);
  const [syncing, setSyncing] = useState(initialLoggedIn);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(!initialLoggedIn);
  const [goals, setGoals] = useState<GoalItem[]>(initialLoggedIn?[]:seedGoals);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [transfers, setTransfers] = useState<{id:string;fromTransactionId:string|null;toTransactionId:string|null;feeAmount:number;feeCurrency:string;bookedAt:string}[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(initialLoggedIn?[]:seedCategories);
  const [savedBudgets, setSavedBudgets] = useState<BudgetItem[]>([]);
  const [planningPeriod,setPlanningPeriod]=useState<"month"|"week">("month");
  const [budgetPeriodType,setBudgetPeriodType]=useState<"month"|"week">("month");
  const [budgetAnchor,setBudgetAnchor]=useState<string>(()=>toDateKey(new Date()));
  const [baseCurrency,setBaseCurrency]=useState("UAH");
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
  const [pushEnabled,setPushEnabled]=useState(false);
  const [editingAccount,setEditingAccount]=useState<Account|null>(null);
  const [editingGoal,setEditingGoal]=useState<GoalItem|null>(null);
  const [settleTarget,setSettleTarget]=useState<DebtItem|null>(null);
  const [payTarget,setPayTarget]=useState<DebtItem|null>(null);
  const [accountFilter,setAccountFilter]=useState("");
  const [isOnline,setIsOnline]=useState(true);
  const [offlineCount,setOfflineCount]=useState(0);
  const [accountOrder,setAccountOrder]=useState<string[]>(()=>typeof window!=="undefined"?JSON.parse(localStorage.getItem("rivna-account-order")||"[]"):[]);
  const [goalAction,setGoalAction]=useState<{goal:GoalItem;mode:"withdraw"|"break"|"history"}|null>(null);
  const [transferPresetTo,setTransferPresetTo]=useState<string|undefined>(undefined);
  const [topProfile,setTopProfile]=useState<{name:string;email:string}|null>(null);

  useEffect(()=>{
    if(!initialLoggedIn)return;
    fetch("/api/settings",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>data?.profile&&setTopProfile({name:data.profile.name,email:data.profile.email||""})).catch(()=>{});
  },[initialLoggedIn]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setOfflineCount(getOfflineQueue().length);
    const goOnline=()=>{setIsOnline(true);void syncOfflineQueue();};
    const goOffline=()=>setIsOnline(false);
    window.addEventListener("online",goOnline);
    window.addEventListener("offline",goOffline);
    if(navigator.onLine)void syncOfflineQueue();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onInstall=(event:Event)=>{event.preventDefault();setInstallPrompt(event)};
    window.addEventListener("beforeinstallprompt",onInstall);
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams(location.search);
      const pageParam=params.get("page");
      const validPages:Page[]=["Головна","Операції","Бюджет","Рахунки","Накопичення","Аналітика","Борги","Налаштування"];
      if(pageParam&&(validPages as string[]).includes(pageParam))setPage(pageParam as Page);
      else if(params.get("section")==="budget")setPage("Бюджет");
      const modalParam=params.get("modal")||(params.get("action")==="expense"?"expense":null);
      const validModals=["expense","account","goal","debt","recurring","transfer","budget","category","invite","rate"];
      if(modalParam&&validModals.includes(modalParam))setModal(modalParam as typeof modal);
      if("Notification" in window)setPushEnabled(Notification.permission==="granted");
    },0);
    return()=>{window.clearTimeout(timer);window.removeEventListener("beforeinstallprompt",onInstall);window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline)};
  }, []);
  function notify(message:string){setToast(message);window.setTimeout(()=>setToast(""),2200)}
  async function syncOfflineQueue(){
    const queue=getOfflineQueue();
    if(!queue.length)return;
    let remaining=[...queue];
    for(const item of queue){
      try{
        const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.payload)});
        if(response.ok)remaining=remaining.filter(q=>q.id!==item.id);
      }catch{break;}
    }
    saveOfflineQueue(remaining);
    setOfflineCount(remaining.length);
    if(remaining.length<queue.length){notify(`Синхронізовано офлайн-операцій: ${queue.length-remaining.length}`);await refreshFinance();}
  }
  async function refreshFinance() {
    if (!initialLoggedIn) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/finance", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) return notify(data.error);
      setAccounts((data.accounts || []).map((item: Record<string, unknown>, index: number) => ({
        id: String(item.id), name: String(item.name), bank: String(item.bank || "Інший"),
        owner: String(item.owner_label || "Мій"), currency: String(item.currency),
        balance: Number(item.balance), style: bankStyle(String(item.bank||""),index),
        color:item.card_color?String(item.card_color):undefined,cardImage:item.card_image_url?String(item.card_image_url):undefined,
        creditLimit:Number(item.credit_limit)||0,graceEnd:item.grace_period_end?String(item.grace_period_end):undefined,
      })));
      const transferDirection: Record<string, "in" | "out"> = {};
      (data.transfers || []).forEach((tr: Record<string, unknown>) => {
        if (tr.from_transaction_id) transferDirection[String(tr.from_transaction_id)] = "out";
        if (tr.to_transaction_id) transferDirection[String(tr.to_transaction_id)] = "in";
      });
      setTransactions((data.transactions || []).map((item: Record<string, unknown>) => {
        const id = String(item.id);
        const isTransferLeg = item.type === "transfer" || item.type === "exchange";
        const direction = transferDirection[id];
        const isIncomeLike = item.type === "income" || (isTransferLeg && direction === "in");
        return {
        id, title: String(item.note || (isTransferLeg ? (direction==="in"?"Поповнення переказом":"Переказ") : (item.type === "income" ? "Дохід" : "Витрата"))),
        category:String((item.categories as {name?:string}|null)?.name||"Без категорії"),categoryIcon:String((item.categories as {icon?:string}|null)?.icon||"CircleDollarSign"),
        date: new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(item.booked_at))),
        bookedAt:String(item.booked_at),account:String((item.accounts as {name?:string}|null)?.name||""),
        owner:String((item.accounts as {owner_label?:string}|null)?.owner_label||""),
        tags:((item.transaction_tags as {tags?:{name?:string}|null}[]|null)||[]).map(link=>String(link.tags?.name||"")).filter(Boolean),
        amount:Number(item.amount)*(isIncomeLike?1:-1),currency:String(item.currency||"UAH"),impulse:Boolean(item.is_impulsive),kind:String(item.type||"expense"),
      };}));
      setGoals((data.goals||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),target:Number(item.target_amount),current:Number(item.current_amount),currency:String(item.currency),date:item.target_date?String(item.target_date):undefined,color:String(item.color||"#6558E8"),assetType:String(item.asset_type||"savings"),annualRate:item.annual_rate?Number(item.annual_rate):undefined,compoundInterest:Boolean(item.compound_interest),roundBalanceTo:item.round_balance_to?Number(item.round_balance_to):undefined,roundExpenseTo:item.round_expense_to?Number(item.round_expense_to):undefined,expensePercent:item.expense_percent?Number(item.expense_percent):undefined,sourceAccountId:item.source_account_id?String(item.source_account_id):undefined})));      setDebts((data.debts||[]).map((item:Record<string,unknown>)=>({id:String(item.id),person:String(item.person),direction:item.direction==="i_owe"?"i_owe":"owed_to_me",amount:Number(item.amount),currency:String(item.currency),due:item.due_date?String(item.due_date):undefined,note:String(item.note||""),isInstallment:Boolean(item.is_installment),installmentMonths:item.installment_months?Number(item.installment_months):undefined})));
      setRecurring((data.recurring||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),amount:Number(item.amount),currency:String(item.currency),frequency:String(item.frequency),next:String(item.next_run_at),auto:Boolean(item.auto_create),kind:item.kind==="income"?"income":"expense"})));
      setTransfers((data.transfers||[]).map((item:Record<string,unknown>)=>({id:String(item.id),fromTransactionId:item.from_transaction_id?String(item.from_transaction_id):null,toTransactionId:item.to_transaction_id?String(item.to_transaction_id):null,feeAmount:Number(item.fee_amount)||0,feeCurrency:String(item.fee_currency||""),bookedAt:String(item.booked_at||"")})));
      setCategories((data.categories||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),kind:String(item.kind),color:String(item.color||"#6558E8"),icon:String(item.icon||"CircleDollarSign"),isDefault:Boolean(item.is_default)})));
      setSavedBudgets((data.budgets||[]).map((item:Record<string,unknown>)=>({id:String(item.id),categoryId:String(item.category_id),name:String((item.categories as {name?:string}|null)?.name||"Категорія"),icon:String(item.icon||(item.categories as {icon?:string}|null)?.icon||"CircleDollarSign"),limit:Number(item.limit_amount),currency:String(item.currency),month:String(item.month),period:item.period_type==="week"?"week":"month",color:String(item.color||(item.categories as {color?:string}|null)?.color||"#6558E8")})));
      setPlanningPeriod(data.planningPeriod==="week"?"week":"month");
      setBudgetPeriodType(data.planningPeriod==="week"?"week":"month");
      setBaseCurrency(String(data.baseCurrency||"UAH"));
      setAudit((data.audit||[]).map((item:Record<string,unknown>)=>({id:String(item.id),entity:String(item.entity_type),action:String(item.action),created:String(item.created_at),actor:item.actor_id?String(item.actor_id):undefined})));
      setRules((data.rules||[]).map((item:Record<string,unknown>)=>({id:String(item.id),name:String(item.name),conditionType:String(item.condition_type),conditionValue:String(item.condition_value||""),actionType:String(item.action_type),actionCategoryId:item.action_category_id?String(item.action_category_id):undefined,actionGoalId:item.action_goal_id?String(item.action_goal_id):undefined,actionValue:item.action_value?Number(item.action_value):undefined})));
      setCustomRates((data.exchangeRates||[]).map((item:Record<string,unknown>)=>({currency:String(item.quote_currency),rate:Number(item.custom_rate||item.official_rate),date:String(item.rate_date)})));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Помилка синхронізації");
    } finally { setSyncing(false); setHasLoadedOnce(true); }
  }
  // Refresh once when the authenticated application is mounted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer=window.setTimeout(()=>void refreshFinance(),0);return()=>window.clearTimeout(timer); }, [initialLoggedIn]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("rivna-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (skin === "default") delete document.documentElement.dataset.skin;
    else document.documentElement.dataset.skin = skin;
    localStorage.setItem("rivna-skin", skin);
  }, [skin]);
useEffect(() => {
    if (cardStyle === "default") delete document.documentElement.dataset.cardstyle;
    else document.documentElement.dataset.cardstyle = cardStyle;
    localStorage.setItem("rivna-cardstyle", cardStyle);
  }, [cardStyle]);
  useEffect(() => {
    fetch("/api/exchange-rates").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.rates) setRates(data.rates);
    }).catch(() => {});
  }, []);
   const orderedAccounts=useMemo(()=>{
     if(!accountOrder.length)return accounts;
     const byId=new Map(accounts.map(a=>[String(a.id),a]));
     const ordered=accountOrder.map(id=>byId.get(id)).filter(Boolean) as Account[];
     const rest=accounts.filter(a=>!accountOrder.includes(String(a.id)));
     return [...ordered,...rest];
   },[accounts,accountOrder]);
   function reorderAccounts(draggedId:string,targetId:string){
     const ids=orderedAccounts.map(a=>String(a.id));
     const from=ids.indexOf(draggedId),to=ids.indexOf(targetId);
     if(from<0||to<0)return;
     const next=[...ids];
     next.splice(from,1);
     next.splice(to,0,draggedId);
     setAccountOrder(next);
     localStorage.setItem("rivna-account-order",JSON.stringify(next));
   }
  const balance=useMemo(()=>accounts.reduce((sum,account)=>sum+((account.balance||0)+(account.creditLimit||0))*conversionRate(account.currency,rates,customRates)/conversionRate(baseCurrency,rates,customRates),0),[accounts,rates,customRates,baseCurrency]);
  const monthlyFees=useMemo(()=>{
    const now=new Date();
    return transfers.filter(transfer=>{
      if(!transfer.bookedAt||!transfer.feeAmount)return false;
      const date=new Date(transfer.bookedAt);
      return date.getMonth()===now.getMonth()&&date.getFullYear()===now.getFullYear();
    }).reduce((sum,transfer)=>sum+transfer.feeAmount*conversionRate(transfer.feeCurrency||baseCurrency,rates,customRates)/conversionRate(baseCurrency,rates,customRates),0);
  },[transfers,rates,customRates,baseCurrency]);
  const plannedMonthlyIncome=useMemo(()=>recurring.filter(item=>item.kind==="income").reduce((sum,item)=>sum+item.amount*(item.frequency==="weekly"?4.33:item.frequency==="yearly"?1/12:1)*conversionRate(item.currency,rates,customRates)/conversionRate(baseCurrency,rates,customRates),0),[recurring,rates,customRates,baseCurrency]);
  const budgetModalDefaultDate=useMemo(()=>{
    const {periodStart}=budgetPeriodBounds(budgetPeriodType,budgetAnchor);
    return budgetPeriodType==="week"?toDateKey(periodStart):`${periodStart.getFullYear()}-${String(periodStart.getMonth()+1).padStart(2,"0")}`;
  },[budgetPeriodType,budgetAnchor]);
  const normalizedTransactions=useMemo(()=>transactions.map(transaction=>({...transaction,baseAmount:transaction.amount*conversionRate(transaction.currency||"UAH",rates,customRates)/conversionRate(baseCurrency,rates,customRates)})),[transactions,rates,customRates,baseCurrency]);
  const filteredTransactions = transactions.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()));
 const [seenAlerts,setSeenAlerts]=useState<string[]>(()=>typeof window!=="undefined"?JSON.parse(localStorage.getItem("rivna-seen-alerts")||"[]"):[]);
   const [notifOpen,setNotifOpen]=useState(false);
   const [welcomeAlert,setWelcomeAlert]=useState<{key:string;name:string;percent:-1}|null>(null);
     useEffect(()=>{
       if(localStorage.getItem("rivna-just-onboarded")==="1"){
         localStorage.removeItem("rivna-just-onboarded");
         setWelcomeAlert({key:"welcome",name:"Вітаємо в rivna! Все готово — починай керувати фінансами",percent:-1});
       }
     },[]);
     const activeAlerts=useMemo(()=>{
       const now=new Date();
       const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
       const monthSpent:Record<string,number>=transactions.filter(t=>t.amount<0&&t.kind!=="transfer"&&t.kind!=="exchange"&&t.bookedAt?.startsWith(monthKey)).reduce((sum,t)=>{sum[t.category]=(sum[t.category]||0)+Math.abs(t.amount);return sum},{} as Record<string,number>);
       const budgetAlerts=savedBudgets.filter(b=>b.month.startsWith(monthKey)).map(b=>{
         const used=monthSpent[b.name]||0,percent=Math.round(used/b.limit*100);
         return {key:`${b.name}-${monthKey}-${percent>=100?"100":"80"}`,name:b.name,percent};
       }).filter(a=>a.percent>=80);
       return welcomeAlert?[welcomeAlert,...budgetAlerts]:budgetAlerts;
     },[savedBudgets,transactions,welcomeAlert]);
   const hasNewAlerts=activeAlerts.some(a=>!seenAlerts.includes(a.key));
   function openNotifications(){
     setNotifOpen(v=>!v);
     if(!notifOpen&&activeAlerts.length){
       const merged=Array.from(new Set([...seenAlerts,...activeAlerts.map(a=>a.key)]));
       setSeenAlerts(merged);
       localStorage.setItem("rivna-seen-alerts",JSON.stringify(merged));
     }
   }
  const allDebts=useMemo(()=>{
    const creditDebts=accounts.filter(a=>(a.creditLimit||0)>0&&a.balance<0).map(a=>({id:`credit-${a.id}`,person:a.bank,direction:"i_owe" as const,amount:Math.abs(a.balance),currency:a.currency,note:"Кредитні кошти",isVirtual:true,accountId:String(a.id)}));
    return [...debts,...creditDebts];
  },[accounts,debts]);

  async function addExpense(e: React.SyntheticEvent<HTMLFormElement>) {
      e.preventDefault();
      const form=new FormData(e.currentTarget);
      const evaluated=evaluateExpression(amount);
      const value = evaluated!==null?evaluated:Number(amount.replace(",", "."));
    if (!value) return;
    const operationType=form.get("type")==="income"?"income":"expense",isIncome=operationType==="income";
    if (initialLoggedIn) {
          const account = accounts.find(a=>String(a.id)===String(form.get("account")))||accounts[0];
          if (!account) return notify("Спочатку створіть рахунок");
          const payload={
        action:"createTransaction", accountId:account.id, categoryId:form.get("category")||null, amount:value, currency:account.currency, note, type:operationType,
        isImpulsive:!isIncome&&form.get("impulse")==="on",splitTotal:isIncome?null:form.get("splitTotal")||null,personalShare:isIncome?null:form.get("personalShare")||null,
        bookedAt:form.get("date")?new Date(String(form.get("date"))).toISOString():undefined,
        tags:String(form.get("tags")||"").split(/\s+/).filter(Boolean),splitParticipants:String(form.get("splitParticipants")||"").split(",").map(value=>value.trim()).filter(Boolean),
        repeat:form.get("repeat")==="on",repeatFrequency:form.get("repeatFrequency"),repeatDay:form.get("repeatDay"),
        debtId:!isIncome?(form.get("debtId")||null):null,
              };
              if(!navigator.onLine){
                addToOfflineQueue(payload);
                setOfflineCount(getOfflineQueue().length);
                setAmount(""); setNote(""); setModal(null); notify("Немає інтернету — операцію збережено локально, синхронізується автоматично");
                return;
              }
              const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
              const result = await response.json();
              if (!response.ok) return notify(result.error || "Не вдалося додати операцію");
              setAmount(""); setNote(""); setModal(null); notify(isIncome?"Дохід збережено":"Витрату збережено");
              await refreshFinance(); return;
            }
    const account=accounts.find(item=>String(item.id)===String(form.get("account")))||accounts[0];
    setTransactions([{id:Date.now(),title:note||(isIncome?"Новий дохід":"Нова витрата"),category:categories.find(c=>c.id===form.get("category"))?.name||"Інше",date:"Щойно",amount:isIncome?value:-value,currency:account?.currency||"UAH",impulse:!isIncome&&form.get("impulse")==="on"},...transactions]);
    setAmount(""); setNote(""); setModal(null); notify(isIncome?"Дохід додано":"Витрату додано");
  }
  async function addAccount(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (initialLoggedIn) {
      const response = await fetch("/api/finance", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        action:editingAccount?"updateAccount":"createAccount",id:editingAccount?.id, name:form.get("name"), bank:form.get("bank"), owner:form.get("owner"),cardImageUrl:form.get("cardImageUrl"),
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
      if(!window.confirm("Ви впевнені, що хочете видалити рахунок?"))return;
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
      notify("Операцію видалено");
      return;
    }
    setTransactions(transactions.filter(t => t.id !== id));
    notify("Операцію видалено");
  }
  async function financeAction(payload:Record<string,unknown>, success:string) {
    if(!initialLoggedIn){
      const action=String(payload.action||""),id=String(payload.id||"");
      if(action==="createGoal")setGoals(items=>[...items,{id:`goal-${Date.now()}`,name:String(payload.name||"Нова ціль"),target:Number(payload.targetAmount),current:Number(payload.currentAmount)||0,currency:String(payload.currency||"UAH"),date:payload.targetDate?String(payload.targetDate):undefined,color:"#6558E8"}]);
      else if(action==="updateGoal")setGoals(items=>items.map(item=>item.id===id?{...item,name:String(payload.name||item.name),target:Number(payload.targetAmount)||item.target,date:payload.targetDate?String(payload.targetDate):item.date}:item));
      else if(action==="withdrawGoal")setGoals(items=>items.map(item=>item.id===id?{...item,current:Math.max(0,item.current-Number(payload.amount||0))}:item));
      else if(action==="breakGoal")setGoals(items=>items.filter(item=>item.id!==id));
      else if(action==="contributeGoal")setGoals(items=>items.map(item=>item.id===id?{...item,current:Math.min(item.target,item.current+Number(payload.amount||0))}:item));
      else if(action==="createDebt")setDebts(items=>[...items,{id:`debt-${Date.now()}`,person:String(payload.person||"Контакт"),direction:payload.direction==="i_owe"?"i_owe":"owed_to_me",amount:Number(payload.amount),currency:String(payload.currency||"UAH"),due:payload.dueDate?String(payload.dueDate):undefined,note:String(payload.note||"")}]);
      else if(action==="settleDebt")setDebts(items=>items.filter(item=>item.id!==id));
      else if(action==="createRecurring")setRecurring(items=>[...items,{id:`rec-${Date.now()}`,name:String(payload.name||"Платіж"),amount:Number(payload.amount),currency:String(payload.currency||"UAH"),frequency:String(payload.frequency||"monthly"),next:String(payload.nextRunAt),auto:Boolean(payload.autoCreate),kind:payload.kind==="income"?"income":"expense"}]);
      else if(action==="createBudget"){
        const category=categories.find(item=>item.id===String(payload.categoryId));if(!category)return false;
        const next:BudgetItem={id:`budget-${Date.now()}`,categoryId:category.id,name:category.name,icon:String(payload.icon||"CircleDollarSign"),limit:Number(payload.limitAmount),currency:String(payload.currency||"UAH"),month:String(payload.month),period:payload.periodType==="week"?"week":"month",color:String(payload.color||"#6558e8")};
        setSavedBudgets(items=>[...items.filter(item=>!(item.categoryId===next.categoryId&&item.month===next.month&&item.period===next.period)),next]);
      }else if(action==="createCategory")setCategories(items=>[...items,{id:`cat-${Date.now()}`,name:String(payload.name||"Категорія"),kind:String(payload.kind||"expense"),color:String(payload.color||"#6558E8"),icon:String(payload.icon||"CircleDollarSign")}]);
      else if(action==="deleteCategory")setCategories(items=>items.filter(item=>item.id!==id));
      else if(action==="deleteBudget")setSavedBudgets(items=>items.filter(item=>item.id!==id));
      else if(action==="createCustomRate")setCustomRates(items=>[{currency:String(payload.quoteCurrency||"USD"),rate:Number(payload.rate),date:String(payload.date||new Date().toISOString().slice(0,10))},...items.filter(item=>item.currency!==String(payload.quoteCurrency))]);
      else if(action==="createTransfer"){
        const from=String(payload.fromAccountId),to=String(payload.toAccountId),sent=Number(payload.sentAmount),received=Number(payload.receivedAmount),fee=Number(payload.feeAmount)||0;
        if(from===to){notify("Оберіть різні рахунки");return false}
        setAccounts(items=>items.map(item=>String(item.id)===from?{...item,balance:item.balance-sent-(String(payload.feeCurrency)===item.currency?fee:0)}:String(item.id)===to?{...item,balance:item.balance+received-(String(payload.feeCurrency)===item.currency?fee:0)}:item));
      }else if(action==="updateAccount")setAccounts(items=>items.map(item=>String(item.id)===id?{...item,name:String(payload.name||item.name),bank:String(payload.bank||item.bank),owner:String(payload.owner||item.owner),currency:String(payload.currency||item.currency),balance:Number(payload.balance)||0,creditLimit:Number(payload.creditLimit)||0,graceEnd:payload.graceEnd?String(payload.graceEnd):undefined,color:payload.cardColor?String(payload.cardColor):item.color}:item));
      else return false;
      notify(success);return true;
    }
    const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json(); if(!response.ok){notify(result.error||"Помилка збереження");return false;}
    notify(success);await refreshFinance();return true;
  }
async function addGoal(e:React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const payload={
      action:editingGoal?"updateGoal":"createGoal",id:editingGoal?.id,
      name:f.get("name"),targetAmount:Number(f.get("target")),currentAmount:Number(f.get("current")),
      currency:String(f.get("currency")||"UAH"),targetDate:f.get("date")?String(f.get("date")):undefined,
      color:String(f.get("color")||"#6558E8"),assetType:String(f.get("assetType")||"savings"),
      annualRate:f.get("annualRate")||undefined,compoundInterest:f.get("compoundInterest")==="on",
      sourceAccountId:f.get("sourceAccountId")||undefined,
      roundBalanceTo:f.get("roundBalanceTo")||undefined,roundExpenseTo:f.get("roundExpenseTo")||undefined,
      expensePercent:f.get("expensePercent")||undefined,
    };
    if(await financeAction(payload,editingGoal?"Ціль оновлено":"Ціль створено")){setModal(null);setEditingGoal(null);}
  }
  async function withdrawGoal(id:string,amount:number,targetAccountId:string){
    if(await financeAction({action:"withdrawGoal",id,amount,targetAccountId},"Кошти знято"))setGoalAction(null);
      }
      async function breakGoal(id:string,targetAccountId:string){
        if(!window.confirm("Розбити банку? Уся сума перейде на обраний рахунок, ціль буде видалено."))return;
        if(await financeAction({action:"breakGoal",id,targetAccountId},"Банку розбито"))setGoalAction(null);
      }
    async function addRecurring(e:React.SyntheticEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const account=accounts.find(item=>String(item.id)===String(f.get("account")));if(!account)return notify("Оберіть рахунок");if(await financeAction({action:"createRecurring",accountId:account.id,categoryId:f.get("category")||null,name:f.get("name"),amount:Number(f.get("amount")),currency:account.currency,frequency:String(f.get("frequency")),nextRunAt:f.get("date")?String(f.get("date")):undefined,autoCreate:f.get("auto")==="on",kind:String(f.get("kind")||"expense")},f.get("kind")==="income"?"Плановий дохід додано":"Регулярний платіж створено"))setModal(null);}
async function splitBill(participants:{person:string;amount:number}[],note:string){
    let failed=false;
    for(const p of participants){
      const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createDebt",person:p.person,direction:"owed_to_me",amount:p.amount,currency:baseCurrency,note:note||"Спільний чек"})});
      if(!response.ok)failed=true;
    }
    const text=`Рахунок${note?` за "${note}"`:""} розділено на ${participants.length}. Кожен винен: ${formatMoney(participants[0]?.amount||0)} ${baseCurrency}.\n`+participants.map(p=>`${p.person}: ${formatMoney(p.amount)} ${baseCurrency}`).join("\n");
    await navigator.clipboard.writeText(text).catch(()=>{});
    notify(failed?"Частину боргів не вдалося створити, текст скопійовано":"Борги створено, текст для месенджера скопійовано");
    await refreshFinance();
    setModal(null);
  }
async function addDebt(e:React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const totalAmount=Number(f.get("amount"));
    const months=Number(f.get("installmentMonths"))||0;
    const autoDebit=f.get("autoDebit")==="on"&&months>0;
    const debtResponse=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      action:"createDebt",person:f.get("person"),direction:f.get("direction"),amount:totalAmount,currency:String(f.get("currency")||"UAH"),
      dueDate:f.get("date")?String(f.get("date")):undefined,note:String(f.get("note")||""),
      isInstallment:f.get("isInstallment")==="on",installmentMonths:months||undefined,
    })});
    const debtResult=await debtResponse.json();
    if(!debtResponse.ok)return notify(debtResult.error||"Не вдалося додати борг");
    if(autoDebit&&debtResult.data?.id){
      const account=accounts.find(a=>String(a.id)===String(f.get("autoAccount")));
      const perMonth=Math.round((totalAmount/months)*100)/100;
      const recurringResponse=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        action:"createRecurring",accountId:f.get("autoAccount"),categoryId:f.get("autoCategory")||null,
        name:`Розстрочка: ${f.get("person")}`,amount:perMonth,currency:account?.currency||String(f.get("currency")||"UAH"),
        frequency:"monthly",nextRunAt:f.get("autoFirstDate")?new Date(String(f.get("autoFirstDate"))).toISOString():undefined,
        autoCreate:true,debtId:debtResult.data.id,
      })});
      if(!recurringResponse.ok){const recurringResult=await recurringResponse.json();notify(recurringResult.error||"Борг додано, але не вдалося налаштувати автосписання")}
      else notify("Борг і автосписання налаштовано");
    } else notify("Борг додано");
    await refreshFinance();
    setModal(null);
  }
  async function addTransfer(e:React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const toAccountId=String(f.get("to")||"");
    const receivedAmount=Number(f.get("received"))||0;
    const targetAccount=accounts.find(a=>String(a.id)===toAccountId);
    const creditLimitDelta=(targetAccount&&(targetAccount.creditLimit||0)>0&&f.get("reduceCreditLimit")==="on")?receivedAmount:0;
    const success=await financeAction({action:"createTransfer",fromAccountId:f.get("from"),toAccountId,sentAmount:Number(f.get("sent")),receivedAmount,exchangeRate:Number(f.get("rate")),feeAmount:Number(f.get("fee")),feeCurrency:String(f.get("feeCurrency")),note:String(f.get("note")||""),creditLimitDelta},"Переказ виконано");
    if(!success)return;
    setModal(null);
  }
  async function addBudget(e:React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const raw=String(f.get("period"));
    if(budgetPeriodType==="week"&&f.get("cloneWeeks")==="on"&&initialLoggedIn){
      const base=new Date(`${raw}T00:00:00`);
      const year=base.getFullYear(),month=base.getMonth();
      const daysInMonth=new Date(year,month+1,0).getDate();
      const dailyRate=Number(f.get("limit"))/7;
      const weeks:{date:string;limit:number}[]=[];
      for(let day=1;day<=daysInMonth;day+=7){
        const weekDays=Math.min(7,daysInMonth-day+1);
        const weekLimit=Math.round(dailyRate*weekDays*100)/100;
        weeks.push({date:toDateKey(new Date(year,month,day)),limit:weekLimit});
      }
      let failed=false;
      for(const week of weeks){
        const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createBudget",categoryId:f.get("category"),month:week.date,periodType:"week",limitAmount:week.limit,currency:baseCurrency,icon:String(f.get("icon")||"CircleDollarSign"),color:String(f.get("color")||"#6558e8")})});
        if(!response.ok)failed=true;
      }
      if(!failed){
        const monthTotal=weeks.reduce((sum,week)=>sum+week.limit,0);
        const monthResponse=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createBudget",categoryId:f.get("category"),month:`${year}-${String(month+1).padStart(2,"0")}-01`,periodType:"month",limitAmount:Math.round(monthTotal*100)/100,currency:baseCurrency,icon:String(f.get("icon")||"CircleDollarSign"),color:String(f.get("color")||"#6558e8")})});
        if(!monthResponse.ok)failed=true;
      }
      notify(failed?"Частину лімітів не вдалося зберегти":`Ліміт застосовано на ${weeks.length} тижнів, місячний ліміт розраховано автоматично`);
      await refreshFinance();
      if(!failed)setModal(null);
      return;
    }
    if(await financeAction({action:"createBudget",categoryId:f.get("category"),month:budgetPeriodType==="week"?raw:`${raw}-01`,periodType:budgetPeriodType,limitAmount:Number(f.get("limit")),currency:baseCurrency,icon:String(f.get("icon")||"CircleDollarSign"),color:String(f.get("color")||"#6558e8")},"Ліміт збережено"))setModal(null);
  }
  async function addCategory(e:React.SyntheticEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createCategory",name:f.get("name"),kind:String(f.get("kind")),icon:String(f.get("icon")),color:String(f.get("color"))},"Категорію створено"))setModal(null);}
  async function addRule(e:React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    if(await financeAction({action:"createRule",name:f.get("name"),conditionType:f.get("conditionType"),conditionValue:f.get("conditionValue"),actionType:f.get("actionType"),actionCategoryId:f.get("actionCategoryId")||undefined,actionGoalId:f.get("actionGoalId")||undefined,actionValue:f.get("actionValue")||undefined},"Правило створено"))setModal(null);
  }
  async function addCustomRate(e:React.SyntheticEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await financeAction({action:"createCustomRate",quoteCurrency:String(f.get("currency")),rate:Number(f.get("rate")),date:String(f.get("date")||new Date().toISOString().slice(0,10))},"Власний курс збережено"))setModal(null)}
  async function createInvite(e:React.SyntheticEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const response=await fetch("/api/household/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifier:f.get("identifier"),role:f.get("role")})});const result=await response.json();if(!response.ok)return notify(result.error||"Не вдалося створити запрошення");await navigator.clipboard.writeText(result.url);setModal(null);notify(result.emailed?"Запрошення надіслано email, посилання скопійовано":"Посилання запрошення скопійовано");}
  async function enablePush(){
    if(!initialLoggedIn)return notify("Сповіщення активуються після підключення Supabase");
    if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))return notify("Цей браузер не підтримує push");
    const permission=await Notification.requestPermission();if(permission!=="granted")return notify("Дозвіл на сповіщення не надано");
    const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;if(!key)return notify("VAPID-ключ не налаштовано");
    const registration=await navigator.serviceWorker.ready;
    const padding="=".repeat((4-key.length%4)%4);const raw=atob((key+padding).replace(/-/g,"+").replace(/_/g,"/"));const applicationServerKey=Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
    const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
    const response=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(subscription)});
    if(!response.ok)return notify("Не вдалося зберегти push-подpиску");setPushEnabled(true);notify("Push-сповіщення увімкнено");
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
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
        const header = lines[0]?.toLowerCase() || "";
        const isMonobank = header.includes("mcc") || header.includes("сума в валюті картки");
        const rows = lines.slice(1);
        const imported = rows.map((line, index) => {
          const cells = line.split(",").map(v => v.replace(/^"|"$/g, ""));
          if(isMonobank){
            const value = Number((cells[4] || cells[3] || "0").replace(",", "."));
            return { id: Date.now() + index, title: cells[2] || cells[1] || "Monobank", category: "Без категорії", date: cells[0] || "Імпортовано", amount: value };
          }
          const value = Number((cells[3] || "0").replace(",", "."));
          return { id: Date.now() + index, title: cells[0] || "Імпорт", category: cells[1] || "Інше", date: cells[2] || "Імпортовано", amount: value };
        }).filter(item => Number.isFinite(item.amount) && item.amount !== 0);
    setTransactions([...imported, ...transactions]);
    notify(`Імпортовано операцій: ${imported.length}`);
  }

  if (!loggedIn) return <Login dark={dark} setDark={setDark} showPassword={showPassword} setShowPassword={setShowPassword} login={() => setLoggedIn(true)}/>;
 if (!hasLoadedOnce) return <div className="app-loader"><span className="app-loader-logo"/><div className="app-loader-dots"><span/><span/><span/></div></div>;

  const nav: [Page, React.ReactNode][] = [
    ["Головна", <Home key="h"/>], ["Операції", <ArrowUpRight key="o"/>], ["Бюджет", <BarChart3 key="b"/>],
    ["Рахунки", <WalletCards key="r"/>], ["Накопичення", <Target key="c"/>],
    ["Аналітика", <PieChart key="a"/>], ["Борги", <HandCoins key="d"/>],
  ];

  return <main className="app-shell">
    <aside className="sidebar">
<button className="brand brand-button" onClick={() => setPage("Головна")}><span className="brand-mark-logo"/></button>      <nav>{nav.map(([label, icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => setPage(label)}>{icon}{label}</button>)}</nav>
      <div className="side-bottom">
        <button className={page === "Налаштування" ? "active" : ""} onClick={() => setPage("Налаштування")}><Settings/> Налаштування</button>
        <button className="profile" onClick={() => setPage("Налаштування")}><span>{(topProfile?.name||"??").slice(0,2).toUpperCase()}</span><div><strong>{topProfile?.name||"Профіль"}</strong><small>{topProfile?.email||""}</small></div><MoreHorizontal/></button>
      </div>
    </aside>

    <section className="content">
      <header>
        <div><p className="hello">{topProfile?.name?`Вітаємо, ${topProfile.name}`:"Вітаємо"} <span>☀</span></p><h1>{page === "Головна" ? "Ваші фінанси" : page}</h1></div>
        <div className="header-actions">
          <button className="theme-btn" onClick={() => setDark(!dark)} aria-label="Змінити тему">{dark ? <Sun/> : <Moon/>}</button>
          <div className="notification-wrap">
            <button className="theme-btn notification" onClick={openNotifications} aria-label="Сповіщення"><Bell/>{hasNewAlerts&&<i/>}</button>
            {notifOpen && <div className="notification-panel">
              <strong>Сповіщення</strong>
              {activeAlerts.length?activeAlerts.map(a=><div key={a.key} className="notification-item"><span className={a.percent>=100?"negative":""}>{a.name}</span>{a.percent>=0&&<small>{a.percent}% ліміту використано</small>}</div>):<p className="empty-inline">Нових сповіщень немає</p>}
            </div>}
          </div>
          {!isOnline && <span className="offline-badge">Офлайн{offlineCount>0?` · ${offlineCount}`:""}</span>}
          <button className="theme-btn" onClick={() => setModal("purchase-sim")} aria-label="Симулятор великої покупки"><Target/></button>
                    <button className="theme-btn" onClick={() => setModal("wrapped")} aria-label="rivna Wrapped"><Sparkles/></button>
                    <button className="add-btn" onClick={() => setModal("expense")}><Plus/> Додати витрату</button>
        </div>
      </header>

      {page === "Головна" && <Dashboard balance={balance} baseCurrency={baseCurrency} accounts={orderedAccounts} transactions={normalizedTransactions} goals={goals} authenticated={initialLoggedIn} openPage={setPage} addAccount={() => setModal("account")} changeCurrency={setBaseCurrency} monthlyFees={monthlyFees} plannedIncome={plannedMonthlyIncome} recurring={recurring} addRecurring={()=>setModal("recurring")} reorderAccounts={reorderAccounts}/>}{page === "Операції" && <TransactionsView transactions={filteredTransactions} search={search} setSearch={setSearch} remove={removeTransaction} exportCsv={() => exportCsv(transactions, notify)} exportExcel={()=>exportExcel(transactions,notify)} exportJson={()=>exportJson(transactions,notify)} initialAccount={accountFilter}/>}      {page === "Бюджет" && (initialLoggedIn?<LiveBudgetView budgets={savedBudgets} transactions={normalizedTransactions} periodType={budgetPeriodType} setPeriodType={setBudgetPeriodType} anchor={budgetAnchor} setAnchor={setBudgetAnchor} baseCurrency={baseCurrency} add={()=>setModal("budget")} remove={(id: string|number)=>financeAction({action:"deleteBudget",id},"Ліміт видалено")}/>:<BudgetView budgets={savedBudgets} transactions={normalizedTransactions} baseCurrency={baseCurrency} add={()=>setModal("budget")} remove={(id: string|number)=>financeAction({action:"deleteBudget",id},"Ліміт видалено")}/>)}
      {page === "Рахунки" && <AccountsView accounts={orderedAccounts} rates={rates} customRates={customRates} add={() => {setEditingAccount(null);setModal("account")}} edit={account=>{setEditingAccount(account);setModal("account")}} addRate={()=>setModal("rate")} transfer={()=>{setTransferPresetTo(undefined);setModal("transfer")}} remove={removeAccount} reorderAccounts={reorderAccounts}/>}
      {page === "Накопичення" && <>
        <GoalsView goals={goals} authenticated={initialLoggedIn} add={()=>{setEditingGoal(null);setModal("goal")}} contribute={(id,amount)=>financeAction({action:"contributeGoal",id,amount},"Ціль поповнено")} recurring={recurring} addRecurring={()=>setModal("recurring")} edit={goal=>{setEditingGoal(goal);setModal("goal")}} openAction={(goal,mode)=>setGoalAction({goal,mode})}/>
        <InvestmentSimulator goals={goals} baseCurrency={baseCurrency}/>
      </>}
      {page === "Аналітика" && <AnalyticsView transactions={normalizedTransactions} baseCurrency={baseCurrency} recurring={recurring} balance={balance} rates={rates} customRates={customRates}/>}
      {page === "Борги" && <>
        <DebtsView debts={allDebts} add={()=>setModal("debt")} settle={debt=>debt.direction==="owed_to_me"?setSettleTarget(debt):financeAction({action:"settleDebt",id:debt.id},"Борг закрито")} payOff={accountId=>{setTransferPresetTo(accountId);setModal("transfer")}} openPay={setPayTarget} splitBill={()=>setModal("split")}/>
        <SettlementPanel baseCurrency={baseCurrency} createDebt={(person,amount)=>financeAction({action:"createDebt",person,direction:"owed_to_me",amount,currency:baseCurrency,note:"Спільні витрати місяця"},"Борг створено")}/>
      </>}
      {page === "Налаштування" && <SettingsView dark={dark} setDark={setDark} skin={skin} setSkin={setSkin} cardStyle={cardStyle} setCardStyle={setCardStyle} importCsv={importCsv} categories={categories} audit={audit} pushEnabled={pushEnabled} enablePush={enablePush} installApp={installApp} goals={goals} budgets={savedBudgets} debts={allDebts} transactions={transactions} rules={rules} openAddRule={()=>setModal("rule")} removeRule={id=>financeAction({action:"deleteRule",id},"Правило видалено")} addCategory={()=>setModal("category")} deleteCategory={id=>financeAction({action:"deleteCategory",id},"Категорію видалено")} logout={async () => {
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

    {modal === "expense" && <ExpenseModal amount={amount} setAmount={setAmount} note={note} setNote={setNote} accounts={accounts} categories={categories} debts={debts.filter(d=>d.direction==="i_owe"&&!d.isVirtual)} submit={addExpense} close={() => setModal(null)}/>}
    {modal === "account" && <AccountModal account={editingAccount} submit={addAccount} close={() => {setEditingAccount(null);setModal(null)}} openTransactions={name=>{setAccountFilter(name);setModal(null);setEditingAccount(null);setPage("Операції")}}/>}
    {modal === "goal" && <GoalModal goal={editingGoal} accounts={accounts} submit={addGoal} close={()=>{setModal(null);setEditingGoal(null)}}/>}
    {goalAction && <GoalActionModal action={goalAction} accounts={accounts} withdraw={withdrawGoal} breakGoal={breakGoal} close={()=>setGoalAction(null)}/>}
    {modal === "debt" && <DebtModal accounts={accounts} categories={categories} submit={addDebt} close={()=>setModal(null)}/>}
    {modal === "split" && <SplitBillModal submit={splitBill} close={()=>setModal(null)}/>}
    {modal === "purchase-sim" && <BigPurchaseSimulator balance={balance} recurring={recurring} rates={rates} customRates={customRates} baseCurrency={baseCurrency} close={()=>setModal(null)}/>}
    {modal === "purchase-sim" && <BigPurchaseSimulator balance={balance} recurring={recurring} rates={rates} customRates={customRates} baseCurrency={baseCurrency} close={()=>setModal(null)}/>}
    {modal === "purchase-sim" && <BigPurchaseSimulator balance={balance} recurring={recurring} rates={rates} customRates={customRates} baseCurrency={baseCurrency} close={()=>setModal(null)}/>}
    {modal === "wrapped" && <WrappedModal transactions={transactions} goals={goals} baseCurrency={baseCurrency} close={()=>setModal(null)}/>}
    {settleTarget && <SettleDebtModal debt={settleTarget} accounts={accounts} submit={accountId=>{financeAction({action:"settleDebt",id:settleTarget.id,accountId},"Борг закрито, кошти зараховано");setSettleTarget(null)}} close={()=>setSettleTarget(null)}/>}
    {payTarget && <PayInstallmentModal debt={payTarget} accounts={accounts} submit={(accountId,amount)=>{financeAction({action:"payInstallment",id:payTarget.id,accountId,amount},"Платіж внесено");setPayTarget(null)}} close={()=>setPayTarget(null)}/>}
    {modal === "recurring" && <RecurringModal accounts={accounts} categories={categories} rates={rates} customRates={customRates} submit={addRecurring} close={()=>setModal(null)}/>}
    {modal === "transfer" && <TransferModal accounts={accounts} rates={rates} customRates={customRates} presetToAccountId={transferPresetTo} submit={addTransfer} close={()=>{setModal(null);setTransferPresetTo(undefined)}}/>}
    {modal === "budget" && <BudgetModal categories={categories} period={budgetPeriodType} initialDate={budgetModalDefaultDate} baseCurrency={baseCurrency} submit={addBudget} close={()=>setModal(null)}/>}
    {modal === "category" && <CategoryModal submit={addCategory} close={()=>setModal(null)}/>}
    {modal === "rule" && <RuleModal categories={categories} goals={goals} submit={addRule} close={()=>setModal(null)}/>}
    {modal === "invite" && <InviteModal submit={createInvite} close={()=>setModal(null)}/>}
    {modal === "rate" && <CustomRateModal submit={addCustomRate} close={()=>setModal(null)}/>}
    {toast && <div className="toast">{toast}</div>}
    {syncing && hasLoadedOnce && <div className="sync-bar"/>}
    <div style={{position:"fixed",bottom:"6px",right:"8px",fontSize:"10px",opacity:0.35,pointerEvents:"none",zIndex:9999,fontFamily:"monospace"}}>v{APP_VERSION}</div>
  </main>;
}

function Login({ dark, setDark, showPassword, setShowPassword, login }: {dark:boolean;setDark:(v:boolean)=>void;showPassword:boolean;setShowPassword:(v:boolean)=>void;login:()=>void}) {
  const floatingCards = [
    { top: "6%", left: "5%", rotate: -8, icon: null, label: "Продукти", value: "−₴1 248", color: "#D85A30" },
    { top: "10%", right: "6%", rotate: 7, icon: null, label: "Бюджет", value: "82% виконано", color: undefined },
    { bottom: "24%", left: "3%", rotate: 5, icon: null, label: "Зарплата", value: "+₴24 500", color: "#3B6D11" },
    { bottom: "20%", right: "4%", rotate: -6, icon: null, label: "Ціль: Резерв", value: "60% накопичено", color: undefined },
    { top: "38%", left: "-1%", rotate: -4, icon: "CreditCard", label: "Основна картка" },
    { top: "42%", right: "-1%", rotate: 6, icon: "Repeat2", label: "Netflix щомісяця" },
    { bottom: "8%", left: "22%", rotate: 3, icon: null, label: "Кава", value: "−₴185", color: undefined },
  ];
  return <main className="auth-shell">
    <section className="auth-brand"><div className="brand large"><span className="brand-mark"><CircleDollarSign/></span> rivna</div>
      <div className="auth-copy"><span className="eyebrow"><Sparkles size={14}/> Гроші без зайвої складності</span><h1>Фінанси, які<br/>нарешті зрозумілі.</h1><p>Рахунки, бюджети та спільні цілі — в одному спокійному просторі.</p></div>
      <div className="auth-stat"><div><small>Бюджет під контролем</small><strong>82%</strong></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/></div></div>
    </section>
    <section className="auth-form-wrap"><button className="theme-btn auth-theme" onClick={() => setDark(!dark)}>{dark ? <Sun/> : <Moon/>}</button>
      <div className="auth-float-layer">
        {floatingCards.map((card, index) => (
          <div key={index} className="auth-float-card" style={{top:card.top,left:card.left,right:card.right,bottom:card.bottom,transform:`rotate(${card.rotate}deg)`}}>
            {card.icon === "CreditCard" && <span className="auth-float-icon"><CreditCard size={14}/></span>}
            {card.icon === "Repeat2" && <span className="auth-float-icon"><Repeat2 size={14}/></span>}
            <span className="auth-float-label">{card.label}</span>
            {card.value && <span className="auth-float-value" style={card.color?{color:card.color}:undefined}>{card.value}</span>}
          </div>
        ))}
      </div>
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
function Dashboard({ balance, baseCurrency, accounts, transactions, goals, authenticated, openPage, addAccount, changeCurrency, monthlyFees, plannedIncome, recurring, addRecurring, reorderAccounts }: {balance:number;baseCurrency:string;accounts:Account[];transactions:Transaction[];goals:GoalItem[];authenticated:boolean;openPage:(p:Page)=>void;addAccount:()=>void;changeCurrency:(c:string)=>void;monthlyFees:number;plannedIncome:number;recurring:RecurringItem[];addRecurring:()=>void;reorderAccounts:(draggedId:string,targetId:string)=>void}) {
  const [renderedAt]=useState(()=>Date.now()),now=new Date(renderedAt),month=now.getMonth(),year=now.getFullYear();
  const realDates=transactions.some(transaction=>Boolean(transaction.bookedAt));
  const currentTransactions=realDates?transactions.filter(transaction=>{const date=new Date(transaction.bookedAt!);return date.getMonth()===month&&date.getFullYear()===year}):transactions;
  const previousTransactions=transactions.filter(transaction=>{if(!transaction.bookedAt)return false;const date=new Date(transaction.bookedAt),previous=new Date(year,month-1,1);return date.getMonth()===previous.getMonth()&&date.getFullYear()===previous.getFullYear()});
  const income=currentTransactions.filter(transaction=>transaction.amount>0&&transaction.kind!=="transfer"&&transaction.kind!=="exchange").reduce((sum,transaction)=>sum+(transaction.baseAmount??transaction.amount),0),expense=currentTransactions.filter(transaction=>transaction.amount<0&&transaction.kind!=="transfer"&&transaction.kind!=="exchange").reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0);
  const previousExpense=previousTransactions.filter(transaction=>transaction.amount<0&&transaction.kind!=="transfer"&&transaction.kind!=="exchange").reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0),difference=previousExpense?Math.round((expense-previousExpense)/previousExpense*100):0;
  const daysInMonth=new Date(year,month+1,0).getDate(),forecast=Math.round(expense/Math.max(1,now.getDate())*daysInMonth),projectedBalance=balance-Math.max(0,forecast-expense),monthLabel=new Intl.DateTimeFormat("uk-UA",{month:"long"}).format(now);
  const avgMonthlyExpense=useMemo(()=>{
      const cutoff=new Date();cutoff.setMonth(cutoff.getMonth()-6);
      const monthsCovered:Set<string>=new Set();
      let total=0;
      transactions.filter(t=>t.amount<0&&t.kind!=="transfer"&&t.kind!=="exchange"&&t.bookedAt&&new Date(t.bookedAt)>=cutoff).forEach(t=>{
        total+=Math.abs(t.baseAmount??t.amount);
        const key=t.bookedAt!.slice(0,7);
        monthsCovered.add(key);
      });
      const divisor=Math.max(1,monthsCovered.size);
      return total/divisor;
    },[transactions]);
    const savingsBalance=goals.reduce((sum,g)=>sum+g.current,0);
    const runwayMonths=avgMonthlyExpense>0?savingsBalance/avgMonthlyExpense:0;
  const upcomingObligations=recurring.filter(r=>r.kind==="expense"&&new Date(r.next).getMonth()===month&&new Date(r.next).getFullYear()===year&&new Date(r.next).getDate()>=now.getDate()).reduce((sum,r)=>sum+r.amount,0);
    const goalReserve=goals.reduce((sum,g)=>sum+(g.current>0?0:0),0);
    const daysLeft=Math.max(1,daysInMonth-now.getDate()+1);
    const safeToSpend=Math.max(0,(balance-upcomingObligations-expense)/daysLeft);
    const primaryGoal=goals[0]||(authenticated?null:{id:"demo-goal",name:"Резервний фонд",target:200000,current:120000,currency:"UAH",color:"#6558E8"}),goalProgress=primaryGoal?Math.min(100,Math.round(primaryGoal.current/Math.max(1,primaryGoal.target)*100)):0;
      const symbol=currencySymbol(baseCurrency);
    return <>
      <div className="safe-to-spend-row">
            <div className="safe-to-spend"><small>Можна витратити сьогодні</small><strong>{symbol} {formatMoney(safeToSpend)}</strong></div>
            {savingsBalance>0 && <div className={runwayMonths<3?"safe-to-spend runway-widget low":"safe-to-spend runway-widget"}><small>Подушка безпеки</small><strong>{Math.round(runwayMonths*10)/10} міс.</strong></div>}
          </div>
      <div className="summary-grid"><article className="balance-card"><div className="card-top"><span>Загальний баланс</span><details className="currency-select"><summary>{baseCurrency} <ChevronDown/></summary><div className="currency-options">{["UAH","USD","EUR","GBP","PLN"].map(c=><button key={c} type="button" className={c===baseCurrency?"selected":""} onClick={e=>{e.preventDefault();changeCurrency(c);(e.currentTarget.closest("details") as HTMLDetailsElement|null)?.removeAttribute("open")}}>{c}</button>)}</div></details></div><h2>{symbol} {formatMoney(balance)}<small>.00</small></h2><div className="balance-meta"><span><ArrowUpRight/> +{symbol} {formatMoney(income)} <small>доходи</small></span><span><ArrowDownLeft/> −{symbol} {formatMoney(expense)} <small>витрати</small></span></div><div className="balance-footer"><span>За {monthLabel}</span><span className={difference>0?"negative":"positive"}>{previousExpense?`${difference>0?"+":""}${difference}% до минулого місяця`:"Перший період"}</span></div></article>
    <article className="forecast-card"><div className="card-heading"><div><span>Прогноз на кінець місяця</span><h3>{symbol} {formatMoney(projectedBalance)}</h3></div><span className="forecast-icon"><Sparkles/></span></div><div className="forecast-line"><i style={{width:`${Math.min(100,now.getDate()/daysInMonth*100)}%`}}/><b/></div><p>За поточного темпу витрат · прогноз витрат {symbol} {formatMoney(forecast)}</p>{plannedIncome>0&&<p className="fee-note">Запланований дохід цього місяця: {symbol} {formatMoney(plannedIncome)}</p>}
    {monthlyFees>0&&<p className="fee-note">Комісії за перекази цього місяця: {symbol} {formatMoney(monthlyFees)}</p>}
    <div className="insight"><Sparkles/> {previousExpense?`Темп витрат ${Math.abs(difference)}% ${difference<=0?"нижчий":"вищий"} за минулий місяць`:"Прогноз уточнюється з кожною операцією"}</div></article></div>
<section className="accounts"><div className="section-title"><div><h2>Мої рахунки</h2><p>Баланс усіх активів</p></div><button onClick={() => openPage("Рахунки")}>Усі рахунки <ArrowRight/></button></div><div className="account-row">{accounts.slice(0,4).map(a => <div key={a.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",String(a.id))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorderAccounts(e.dataTransfer.getData("text/plain"),String(a.id))}}><AccountCard account={a}/></div>) }<button className="new-account" onClick={addAccount}><span className="new-account-icon"><Plus/></span><span>{accounts.length?"Додати рахунок":"Додай свій перший рахунок"}</span></button></div></section>    <div className="dashboard-grid"><section className="panel transactions"><div className="section-title"><div><h2>Останні операції</h2><p>Найновіші записи</p></div><button onClick={() => openPage("Операції")}>Усі операції <ArrowRight/></button></div><TransactionList transactions={transactions.slice(0,4)}/></section><section className="panel budget-panel"><div className="section-title"><div><h2>Бюджет: {monthLabel}</h2><p>{daysInMonth-now.getDate()} днів до кінця місяця</p></div><button onClick={() => openPage("Бюджет")}><MoreHorizontal/></button></div><div className="budget-total"><div><small>Витрачено цього місяця</small><strong>{symbol} {formatMoney(expense)}</strong></div><b>{forecast?Math.round(expense/forecast*100):0}% часу</b></div><div className="main-progress"><i style={{width:`${Math.min(100,now.getDate()/daysInMonth*100)}%`}}/></div><button className="budget-open" onClick={()=>openPage("Бюджет")}>Переглянути ліміти категорій <ArrowRight/></button></section></div>
    {primaryGoal && <button className="panel dashboard-goal" onClick={()=>openPage("Накопичення")}><span className="goal-icon"><PiggyBank/></span><div><small>Головна фінансова ціль</small><strong>{primaryGoal.name}</strong><span><i style={{width:`${goalProgress}%`,background:primaryGoal.color}}/></span><p>{goalProgress}% · {primaryGoal.currency} {formatMoney(primaryGoal.current)} з {formatMoney(primaryGoal.target)}</p></div><ArrowRight/></button>}
        <section className="panel recurring-panel"><div className="section-title"><div><h2>Регулярні платежі</h2><p>Підписки, оренда та комунальні</p></div><button className="small-primary" onClick={addRecurring}><Plus/> Додати</button></div><div className="recurring-list">{recurring.filter(r=>r.kind==="expense").length?recurring.filter(r=>r.kind==="expense").map(r=><div key={r.id}><span className="recurring-icon"><Repeat2/></span><strong>{r.name}</strong><small>{r.frequency} · наступний {new Date(r.next).toLocaleDateString("uk-UA")}</small><b>{r.currency} {formatMoney(r.amount)}</b><em>{r.auto?"Автоматично":"Нагадування"}</em></div>):<p className="empty-inline">Регулярних платежів поки немає</p>}</div></section>
      </>;
    }

function TransactionsView({ transactions, search, setSearch, remove, exportCsv,exportExcel,exportJson,initialAccount }: {transactions:Transaction[];search:string;setSearch:(s:string)=>void;remove:(id:number|string)=>void;exportCsv:()=>void;exportExcel:()=>void;exportJson:()=>void;initialAccount?:string}) {  const [account,setAccount]=useState(initialAccount||"");
  useEffect(()=>{if(initialAccount)setAccount(initialAccount)},[initialAccount]);
  const [category,setCategory]=useState("");const [owner,setOwner]=useState("");const [tag,setTag]=useState("");const [from,setFrom]=useState("");const [to,setTo]=useState("");
  const unique=(values:(string|undefined)[])=>Array.from(new Set(values.filter(Boolean) as string[])).sort();
  const shown=transactions.filter(t=>(!account||t.account===account)&&(!category||t.category===category)&&(!owner||t.owner===owner)&&(!tag||t.tags?.includes(tag))&&(!from||!t.bookedAt||t.bookedAt>=`${from}T00:00:00`)&&(!to||!t.bookedAt||t.bookedAt<=`${to}T23:59:59`));
  const clear=()=>{setAccount("");setCategory("");setOwner("");setTag("");setFrom("");setTo("");};
  return <section className="panel full-view"><div className="view-toolbar"><label className="search-box"><Search/><input placeholder="Пошук за назвою або категорією" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="secondary" onClick={clear}><X/> Очистити</button><button className="secondary" onClick={exportCsv}><Download/> CSV</button><button className="secondary" onClick={exportExcel}><Download/> Excel</button><button className="secondary" onClick={exportJson}><Download/> JSON</button></div><div className="filter-grid"><label>Рахунок<select value={account} onChange={e=>setAccount(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.account)).map(v=><option key={v}>{v}</option>)}</select></label><label>Категорія<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.category)).map(v=><option key={v}>{v}</option>)}</select></label><label>Тег<select value={tag} onChange={e=>setTag(e.target.value)}><option value="">Усі</option>{unique(transactions.flatMap(t=>t.tags||[])).map(v=><option key={v}>{v}</option>)}</select></label><label>Власник<select value={owner} onChange={e=>setOwner(e.target.value)}><option value="">Усі</option>{unique(transactions.map(t=>t.owner)).map(v=><option key={v}>{v}</option>)}</select></label><label>Від<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>До<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div><div className="data-head"><span>Операція</span><span>Категорія</span><span>Дата</span><span>Сума</span><span/></div>{shown.map(t=><div className="data-row" key={t.id}><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}<small className="row-tags">{t.tags?.map(x=>`#${x}`).join(" ")}</small></strong><span>{t.category}<small>{t.account}{t.owner?` · ${t.owner}`:""}</small></span><span>{t.date}</span><b className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} {currencySymbol(t.currency||"UAH")} {formatMoney(t.amount)}</b><button className="icon-button danger" onClick={()=>remove(t.id)}><Trash2/></button></div>)}{shown.length===0&&<EmptyState icon={<Search/>} text={transactions.length?"Нічого не знайдено за цим фільтром":"Тут з'являться твої операції — додай першу через кнопку «Додати витрату»"}/>}</section>;
}
function BudgetView({budgets,transactions,add,baseCurrency,remove}: {budgets: BudgetItem[]; transactions: Transaction[]; add: ()=>void; baseCurrency: string; remove: (id: number|string)=>void}) {
  const active = budgets.length
    ? budgets
    : budgetRows.map((b, i) => ({
        id: `d${i}`,
        categoryId: "",
        name: b.name,
        icon: "CircleDollarSign",
        limit: b.limit,
        currency: "UAH",
        month: "2026-07-01",
        period: "month" as const,
        color: b.color,
      }));

  const spentBy = transactions
    .filter((t) => t.amount < 0 && t.kind !== "transfer" && t.kind !== "exchange")
    .reduce<Record<string, number>>((a, t) => {
      a[t.category] = (a[t.category] || 0) + Math.abs(t.amount);
      return a;
    }, {});

  const plan = active.reduce((s, b) => s + b.limit, 0);
  const spent = Object.values(spentBy).reduce((s, v) => s + v, 0);
  const day = Math.max(1, new Date().getDate());
  const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const forecast = Math.round((spent / day) * days);
  const symbol = currencySymbol(baseCurrency);

  return (
    <>
      <div className="metric-grid">
        <article className="metric">
          <small>Місячний план</small>
          <strong>
            {symbol} {formatMoney(plan)}
          </strong>
          <span>{plan ? Math.round((spent / plan) * 100) : 0}% використано</span>
        </article>
        <article className="metric">
          <small>Прогноз витрат</small>
          <strong>
            {symbol} {formatMoney(forecast)}
          </strong>
          <span className={forecast > plan ? "negative" : "positive"}>
            {forecast > plan ? "Можливий перерозхід" : "У межах плану"}
          </span>
        </article>
        <article className="metric">
          <small>Очікуваний залишок</small>
          <strong>{symbol} {formatMoney(Math.max(0, plan - forecast))}</strong>
          <span>За поточного темпу</span>
        </article>
      </div>

      <section className="panel full-view">
        <div className="section-title">
          <div>
            <h2>Ліміти за категоріями</h2>
            <p>Поточний місяць</p>
          </div>
          <button className="small-primary" onClick={add}>
            <Plus /> Додати ліміт
          </button>
        </div>
        <div className="large-budget">
          <div className="budget-list">
            {active.map((b) => {
              const used = spentBy[b.name] || 0;
              const pct = Math.round((used / b.limit) * 100);
              return (
                <div
                  className="budget-item"
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    padding: "8px",
                    borderRadius: "4px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      className="budget-icon"
                      style={{
                        color: b.color,
                        background: `${b.color}15`,
                        marginRight: "10px",
                        padding: "8px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BudgetIcon name={b.icon} />
                    </span>
                    <div>
                      <div>
                        <strong>{b.name}</strong>
                        <small>
                          {symbol} {formatMoney(used)} / {formatMoney(b.limit)} · {pct}%
                        </small>
                      </div>
                      <span>
                        <i
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            background:
                              pct >= 100
                                ? "#e05252"
                                : pct >= 80
                                ? "#f4b740"
                                : b.color,
                            display: "block",
                            height: "4px",
                          }}
                        />
                      </span>
                    </div>
                  </div>
                  {/* Кнопка видалення */}
                  <button
                    onClick={() => {
                      if (confirm("Ви впевнені, що хочете видалити цей ліміт?")) {
                        remove(b.id);
                      }
                    }}
                    className="icon-button danger"
                    aria-label="Видалити ліміт"
                    style={{ marginLeft: "10px" }}
                  >
                    <Trash2 />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {active.some((b) => (spentBy[b.name] || 0) / b.limit >= 0.8) && (
          <div className="alert-card">
            <Bell />
            <div>
              <strong>Наближення до ліміту</strong>
              <p>Одна або кілька категорій використані більш ніж на 80%.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
function LiveBudgetView({
  budgets,
  transactions,
  periodType,
  setPeriodType,
  anchor,
  setAnchor,
  baseCurrency,
  add,
  remove,
}: {
  budgets: BudgetItem[];
  transactions: Transaction[];
  periodType: "month" | "week";
  setPeriodType: (p: "month" | "week") => void;
  anchor: string;
  setAnchor: (iso: string) => void;
  baseCurrency: string;
  add: () => void;
  remove: (id: string) => void;
}) {
  const { periodStart, periodEnd } = budgetPeriodBounds(periodType, anchor);
  const isCurrent = new Date() >= periodStart && new Date() < periodEnd;
  const currentMonthKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;

  type DisplayBudget = BudgetItem & { sourceIds: string[] };

  const periodTransactions = transactions.filter((t) => {
    if (!t.bookedAt) return isCurrent;
    const date = new Date(t.bookedAt);
    return date >= periodStart && date < periodEnd;
  });

  const periodBudgets = budgets.filter((b) => {
    if (periodType === "week") {
      if (b.period !== "week") return false;
      const budgetDate = new Date(`${b.month}T00:00:00`);
      return budgetDate >= periodStart && budgetDate < periodEnd;
    }
    const budgetDate = new Date(`${b.month}T00:00:00`);
    return (
      (b.period === "month" && b.month === `${currentMonthKey}-01`) ||
      (b.period === "week" && budgetDate >= periodStart && budgetDate < periodEnd)
    );
  });

  const activeBudgets: DisplayBudget[] = (() => {
    if (periodType !== "month") return periodBudgets.map((budget) => ({ ...budget, sourceIds: [budget.id] }));
    const realMonthBudgets = periodBudgets.filter((b) => b.period === "month");
    const coveredCategories = new Set(realMonthBudgets.map((b) => b.categoryId || b.name));
    const weekBudgetsToAggregate = periodBudgets.filter(
      (b) => b.period === "week" && !coveredCategories.has(b.categoryId || b.name),
    );
    const aggregated = Object.values(
      weekBudgetsToAggregate.reduce<Record<string, DisplayBudget>>((map, budget) => {
        const key = budget.categoryId || budget.name;
        if (!map[key]) {
          map[key] = { ...budget, id: `agg-${currentMonthKey}-${key}`, period: "month", sourceIds: [budget.id] };
          map[key].limit = 0;
        } else {
          map[key].sourceIds.push(budget.id);
        }
        map[key].limit += budget.limit;
        return map;
      }, {}),
    );
    return [...realMonthBudgets.map((b) => ({ ...b, sourceIds: [b.id] })), ...aggregated];
  })();

  const spentBy = periodTransactions
    .filter((t) => t.amount < 0 && t.kind !== "transfer" && t.kind !== "exchange")
    .reduce<Record<string, number>>((sum, t) => {
      sum[t.category] = (sum[t.category] || 0) + Math.abs(t.baseAmount ?? t.amount);
      return sum;
    }, {});

  const plan = activeBudgets.reduce((sum, b) => sum + b.limit, 0);
  const spent = Object.values(spentBy).reduce((sum, v) => sum + v, 0);
  const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000);
  const elapsedDays = isCurrent ? Math.min(totalDays, Math.floor((Date.now() - periodStart.getTime()) / 86400000) + 1) : totalDays;
  const forecast = Math.round((spent / Math.max(1, elapsedDays)) * totalDays);
  const periodLabel = periodType === "week" ? "тиждень" : "місяць";
  const planLabel = periodType === "week" ? "Тижневий план" : "Місячний план";
  const symbol = currencySymbol(baseCurrency);
  const periodEndInclusive = new Date(periodEnd.getTime() - 86400000);
  const rangeLabel =
    periodType === "week"
      ? `${periodStart.getDate()} – ${periodEndInclusive.getDate()} ${new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(periodStart)} ${periodStart.getFullYear()}`
      : new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(periodStart);

  const goNext = () => setAnchor(toDateKey(periodEnd));
  const goPrev = () => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() - 1);
    setAnchor(toDateKey(d));
  };
  const goToday = () => setAnchor(toDateKey(new Date()));

  return (
    <>
      <div className="period-note">
        <div className="period-toggle">
          <button type="button" className={periodType === "month" ? "active" : ""} onClick={() => { setPeriodType("month"); goToday(); }}>Місяць</button>
          <button type="button" className={periodType === "week" ? "active" : ""} onClick={() => { setPeriodType("week"); goToday(); }}>Тиждень</button>
        </div>
        <div className="period-label">{rangeLabel}{isCurrent && <em className="period-current">поточний</em>}</div>
        <div className="period-nav-row">
          <button type="button" className="period-nav-btn" onClick={goPrev}>← Назад</button>
          {!isCurrent && <button type="button" className="period-nav-btn today" onClick={goToday}>Сьогодні</button>}
          <button type="button" className="period-nav-btn" onClick={goNext}>Вперед →</button>
        </div>
      </div>
      <div className="metric-grid">
        <article className="metric"><small>{planLabel}</small><strong>{symbol} {formatMoney(plan)}</strong><span>{plan ? Math.round((spent / plan) * 100) : 0}% використано</span></article>
        <article className="metric"><small>Прогноз витрат</small><strong>{symbol} {formatMoney(forecast)}</strong><span className={plan && forecast > plan ? "negative" : "positive"}>{!plan ? "Додайте перший ліміт" : forecast > plan ? "Можливий перерозхід" : "У межах плану"}</span></article>
        <article className="metric"><small>Очікувана економія</small><strong>{symbol} {formatMoney(Math.max(0, plan - forecast))}</strong><span>За поточного темпу</span></article>
      </div>
      <section className="panel full-view">
        <div className="section-title"><div><h2>Ліміти за категоріями</h2><p>{isCurrent ? `Поточний ${periodLabel}` : rangeLabel}</p></div><button className="small-primary" onClick={add}><Plus /> Додати ліміт</button></div>
       {activeBudgets.length ? (
        <div className="large-budget"><div className="budget-list">{activeBudgets.map((budget) => {
            const used = spentBy[budget.name] || 0;
            const percent = Math.round((used / budget.limit) * 100);
            const isOver = percent >= 100;
            return (
              <div className={isOver ? "budget-item over-budget" : "budget-item"} key={budget.id}>
                <button className="icon-button danger" onClick={() => { if (window.confirm("Видалити цей ліміт?")) budget.sourceIds.forEach((id) => remove(id)); }} aria-label="Видалити ліміт"><Trash2 size={13}/></button>
                <span className="budget-icon" style={{ color: budget.color, background: `${budget.color}15` }}><BudgetIcon name={budget.icon} size={17}/></span>
                <strong>{budget.name}</strong>
                <span className={isOver ? "budget-amount over" : "budget-amount"}>{symbol} {formatMoney(used)}</span>
                <small>з {formatMoney(budget.limit)}₴ · {percent}%{budget.sourceIds.length > 1 ? ` · ${budget.sourceIds.length} тиж.` : ""}</small>
                <span><i style={{ width: `${Math.min(100, percent)}%`, background: percent >= 100 ? "#e05252" : percent >= 80 ? "#f4b740" : budget.color }} /></span>
              </div>
            );
          })}</div></div>
      ) : (
        <EmptyState icon={<BarChart3/>} text={`Лімітів на цей ${periodLabel} ще немає — додай перший через кнопку вище`}/>
      )}
        {activeBudgets.some((budget) => (spentBy[budget.name] || 0) / budget.limit >= 0.8) && (
                  <div className="alert-card"><Bell /><div><strong>Наближення до ліміту</strong><p>Одна або кілька категорій використані більш ніж на 80%.</p></div></div>
                )}
              </section>
              <section className="panel"><div className="section-title"><div><h2>Витрати за категоріями</h2><p>Розподіл за {periodType==="week"?"тиждень":"місяць"}</p></div></div><div className="category-chart">{Object.entries(spentBy).sort((a,b)=>b[1]-a[1]).map(([name,value],index)=><div key={name}><span style={{background:`hsl(${250-index*34} 72% ${58+index*3}%)`}}/><strong>{name}</strong><i><b style={{width:`${value/(Object.values(spentBy)[0]||1)*100}%`}}/></i><em>{spent?Math.round(value/spent*100):0}%</em></div>)}{!Object.keys(spentBy).length&&<p className="empty-inline">Додай операції для розподілу за категоріями</p>}</div></section>
            </>
          );
        }
function AccountsView({accounts,rates,customRates,add,edit,addRate,transfer,remove,reorderAccounts}:{accounts:Account[];rates:{currency:string;rate:number;date:string}[];customRates:{currency:string;rate:number;date:string}[];add:()=>void;edit:(account:Account)=>void;addRate:()=>void;transfer:()=>void;remove:(id:number|string)=>void;reorderAccounts:(draggedId:string,targetId:string)=>void}) { const visible=rates.filter(r=>["USD","EUR"].includes(r.currency)); return <section className="panel full-view"><div className="section-title"><div><h2>Усі рахунки</h2><p>UAH, USD та інші валюти</p></div><div className="title-actions"><button className="secondary" onClick={transfer}><ArrowRight/> Переказ / обмін</button><button className="small-primary" onClick={add}><Plus/> Новий рахунок</button></div></div>{!accounts.length&&<button className="new-account" style={{width:"100%",minHeight:"140px",marginBottom:"20px"}} onClick={add}><span className="new-account-icon"><Plus/></span><span>Додай свій перший рахунок, щоб почати</span></button>}<div className="accounts-grid">{accounts.map(a=><div className="account-wrap" key={a.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",String(a.id))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorderAccounts(e.dataTransfer.getData("text/plain"),String(a.id))}}><div onClick={()=>edit(a)}><AccountCard account={a}/></div><div className="account-actions"><button className="remove-account" onClick={()=>remove(a.id)}><Trash2/> Видалити</button></div></div>)}</div><div className="rate-card"><Landmark/><div><strong>Офіційний курс НБУ</strong><p>{visible.length ? visible.map(r=>`${r.currency} ${r.rate.toFixed(4)}`).join(" · ") : "Оновлення курсів…"}{customRates.length?` · Власний: ${customRates.slice(0,3).map(r=>`${r.currency} ${r.rate}`).join(", ")}`:""}</p></div><button className="secondary" onClick={addRate}>Власний курс</button></div></section>; }
const ASSET_TYPE_LABELS:Record<string,string>={savings:"Накопичення",deposit:"Депозит",bond:"Облігація",security:"Цінний папір"};
const ASSET_TYPE_ICONS:Record<string,React.ComponentType<{size?:number}>>={savings:PiggyBank,deposit:Landmark,bond:HandCoins,security:BarChart3};
function GoalsView({goals,authenticated,add,contribute,recurring,addRecurring,edit,openAction}:{goals:GoalItem[];authenticated:boolean;add:()=>void;contribute:(id:string,amount:number)=>void;recurring:RecurringItem[];addRecurring:()=>void;edit:(goal:GoalItem)=>void;openAction:(goal:GoalItem,mode:"withdraw"|"break"|"history")=>void}) {
  const shown=goals.length?goals:(authenticated?[]:[{id:"demo1",name:"Резервний фонд",target:200000,current:120000,currency:"UAH",color:"#6558E8"},{id:"demo2",name:"Подорож до Японії",target:150000,current:38500,currency:"UAH",color:"#159B70"}]);
  const isEmpty=authenticated&&!goals.length;
    return <>
      <section className="panel full-view"><div className="section-title"><div><h2>Фінансові цілі</h2><p>Накопичення, депозити та цінні папери</p></div>{!isEmpty&&<button className="small-primary" onClick={add}><Plus/> Нова ціль</button>}</div>
        {isEmpty && <div className="goals-empty"><span className="empty-state-icon"><PiggyBank/></span><p>У тебе ще немає фінансових цілей — створи першу банку, щоб почати накопичувати</p><button className="round-add-btn" onClick={add} aria-label="Нова ціль"><Plus/></button></div>}
      {!isEmpty && <div className="goals-grid">{shown.map(g=>{
        const percent=Math.min(100,Math.round(g.current/g.target*100)),symbol=currencySymbol(g.currency);
                const AssetIcon=ASSET_TYPE_ICONS[g.assetType||"savings"]||PiggyBank;
                return <article className="goal-card" key={g.id}>
                                  <div className="goal-card-top">
                                    <span className="goal-icon"><AssetIcon size={18}/></span>
                                    {g.assetType&&g.assetType!=="savings"&&<em className="goal-asset-badge">{ASSET_TYPE_LABELS[g.assetType]}</em>}
                                  </div>
                                  <small className="goal-card-label">{g.date?`До ${new Date(g.date).toLocaleDateString("uk-UA")}`:"Фінансова ціль"}{g.annualRate?` · ${g.annualRate}% річних${g.compoundInterest?" · капіталізація":""}`:""}</small>
                                  <h3 className="goal-card-name">{g.name}</h3>
                                  <strong className="goal-card-amount">{symbol} {formatMoney(g.current)}</strong>
                                  <p className="goal-card-target">з {symbol} {formatMoney(g.target)}</p>
                                  <div className="goal-card-bar"><i style={{width:`${percent}%`,background:g.color}}/></div>
                                  <div className="goal-actions-row">
                    <button className="goal-action-btn" onClick={()=>contribute(g.id,1000)} aria-label="Поповнити"><Plus size={14}/></button>
                    <button className="goal-action-btn" onClick={()=>edit(g)} aria-label="Редагувати"><Settings size={14}/></button>
                    <button className="goal-action-btn" onClick={()=>openAction(g,"history")} aria-label="Історія"><BarChart3 size={14}/></button>
                    <button className="goal-action-btn" onClick={()=>openAction(g,"withdraw")} aria-label="Зняти"><ArrowUpRight size={14}/></button>
                    <button className="goal-action-btn danger" onClick={()=>openAction(g,"break")} aria-label="Розбити банку"><Trash2 size={14}/></button>
                  </div>
                </article>;
      })}</div>}
          </section>
    </>;
    }
function AnalyticsView({transactions,baseCurrency,recurring,balance,rates,customRates}:{transactions:Transaction[];baseCurrency:string;recurring:RecurringItem[];balance:number;rates:{currency:string;rate:number}[];customRates:{currency:string;rate:number}[]}) {
  const plannedIncomeItems=recurring.filter(r=>r.kind==="income");
  const [period,setPeriod]=useState<"month"|"week">("month"),[renderedAt]=useState(()=>Date.now()),now=new Date(renderedAt);
  const weekStart=(date:Date)=>{const result=new Date(date);result.setHours(0,0,0,0);result.setDate(result.getDate()-((result.getDay()+6)%7));return result};
  const buckets=period==="month"?Array.from({length:6},(_,index)=>{const start=new Date(now.getFullYear(),now.getMonth()-5+index,1),end=new Date(start.getFullYear(),start.getMonth()+1,1);return {key:start.toISOString(),start,end,label:new Intl.DateTimeFormat("uk-UA",{month:"short"}).format(start).replace(".",""),value:0}}):Array.from({length:8},(_,index)=>{const current=weekStart(now),start=new Date(current);start.setDate(start.getDate()-(7*(7-index)));const end=new Date(start);end.setDate(end.getDate()+7);return {key:start.toISOString(),start,end,label:`${start.getDate()}.${start.getMonth()+1}`,value:0}});
  const bucketFor=(transaction:Transaction)=>{if(!transaction.bookedAt)return buckets.at(-1);const date=new Date(transaction.bookedAt);return buckets.find(bucket=>date>=bucket.start&&date<bucket.end)};
 transactions.filter(transaction=>transaction.amount<0&&transaction.kind!=="transfer"&&transaction.kind!=="exchange").forEach(transaction=>{const bucket=bucketFor(transaction);if(bucket)bucket.value+=Math.abs(transaction.baseAmount??transaction.amount)});
  const currentTransactions=transactions.filter(transaction=>bucketFor(transaction)===buckets.at(-1)),expenses=currentTransactions.filter(transaction=>transaction.amount<0&&transaction.kind!=="transfer"&&transaction.kind!=="exchange");
  const total=expenses.reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0),income=currentTransactions.filter(transaction=>transaction.amount>0&&transaction.kind!=="transfer"&&transaction.kind!=="exchange").reduce((sum,transaction)=>sum+(transaction.baseAmount??transaction.amount),0),impulsive=expenses.filter(transaction=>transaction.impulse).reduce((sum,transaction)=>sum+Math.abs(transaction.baseAmount??transaction.amount),0);
  const grouped=Object.entries(expenses.reduce<Record<string,number>>((sum,transaction)=>{sum[transaction.category]=(sum[transaction.category]||0)+Math.abs(transaction.baseAmount??transaction.amount);return sum},{})).sort((a,b)=>b[1]-a[1]);
  const current=buckets.at(-1)?.value||0,previous=buckets.at(-2)?.value||0,delta=previous?Math.round((current-previous)/previous*100):0,maxValue=Math.max(...buckets.map(bucket=>bucket.value),1),symbol=currencySymbol(baseCurrency);
  return <><div className="period-switch"><button className={period==="month"?"active":""} onClick={()=>setPeriod("month")}>За місяцями</button><button className={period==="week"?"active":""} onClick={()=>setPeriod("week")}>За тижнями</button></div><div className="metric-grid"><article className="metric"><small>Витрати за {period==="month"?"місяць":"тиждень"}</small><strong>{symbol} {formatMoney(total)}</strong><span>Поточний період</span></article><article className="metric"><small>Доходи</small><strong>{symbol} {formatMoney(income)}</strong><span className="positive">Чистий потік {symbol} {formatMoney(income-total)}</span></article><article className="metric"><small>Імпульсивні покупки</small><strong>{symbol} {formatMoney(impulsive)}</strong><span>{total?Math.round(impulsive/total*100):0}% усіх витрат</span></article></div>
    <section className="panel monthly-panel"><div className="section-title"><div><h2>Динаміка витрат</h2><p>{period==="month"?"Останні шість місяців":"Останні вісім тижнів"}</p></div><span className={delta>0?"comparison negative":"comparison positive"}>{previous?`${delta>0?"+":""}${delta}% до попереднього періоду`:"Ще немає порівняння"}</span></div><div className="monthly-chart">{buckets.map(bucket=><div key={bucket.key}><strong>{bucket.value?`${symbol}${formatMoney(bucket.value)}`:"—"}</strong><span><i style={{height:`${Math.max(bucket.value?8:2,bucket.value/maxValue*100)}%`}}/></span><small>{bucket.label}</small></div>)}</div></section>
    <div className="analytics-grid"><section className="panel"><div className="section-title"><div><h2>Витрати за категоріями</h2><p>Розподіл поточного періоду</p></div></div><div className="category-chart">{grouped.length?grouped.map(([name,value],index)=><div key={name}><span style={{background:`hsl(${250-index*34} 72% ${58+index*3}%)`}}/><strong>{name}</strong><i><b style={{width:`${value/(grouped[0]?.[1]||1)*100}%`}}/></i><em>{Math.round(value/total*100)}%</em></div>):<p className="empty-inline">Додайте операції для аналітики</p>}</div></section><section className="panel impulse-report"><span className="wizard-icon"><Sparkles/></span><h2>Звіт про імпульсивні витрати</h2><strong>{expenses.filter(transaction=>transaction.impulse).length} покупок</strong><p>Позначайте незаплановані покупки під час створення операції. Rivna покаже їхню частку та вплив на план.</p><div className="donut" style={{"--percent":`${total?impulsive/total*100:0}%`} as React.CSSProperties}><span>{total?Math.round(impulsive/total*100):0}%</span></div></section></div>
    <section className="panel recurring-panel"><div className="section-title"><div><h2>Заплановані доходи</h2><p>Регулярні надходження</p></div></div><div className="recurring-list">{plannedIncomeItems.length?plannedIncomeItems.map(r=><div key={r.id}><span className="recurring-icon"><ArrowDownLeft/></span><strong>{r.name}</strong><small>{r.frequency} · наступний {new Date(r.next).toLocaleDateString("uk-UA")}</small><b className="income-amount">+{r.currency} {formatMoney(r.amount)}</b><em>{r.auto?"Автоматично":"Нагадування"}</em></div>):<p className="empty-inline">Планових доходів поки немає — додай через «Регулярний платіж», обравши «Дохід»</p>}</div></section>
        <CashflowCalendar balance={balance} recurring={recurring} transactions={transactions} rates={rates} customRates={customRates} baseCurrency={baseCurrency}/>
            <AnomalyAlerts transactions={transactions} baseCurrency={baseCurrency}/>
          </>;
        }
function AnomalyAlerts({transactions,baseCurrency}:{transactions:Transaction[];baseCurrency:string}){
  const symbol=currencySymbol(baseCurrency);
  const anomalies=useMemo(()=>{
    const now=new Date();
    const thisWeekStart=new Date(now);thisWeekStart.setDate(now.getDate()-7);
    const historyStart=new Date(now);historyStart.setDate(now.getDate()-56);
    const expenses=transactions.filter(t=>t.amount<0&&t.kind!=="transfer"&&t.kind!=="exchange"&&t.bookedAt);
    const byCategory:Record<string,{recent:number;history:number[]}>={};
    expenses.forEach(t=>{
      const date=new Date(t.bookedAt!);
      const amount=Math.abs(t.baseAmount??t.amount);
      if(!byCategory[t.category])byCategory[t.category]={recent:0,history:[]};
      if(date>=thisWeekStart)byCategory[t.category].recent+=amount;
      else if(date>=historyStart)byCategory[t.category].history.push(amount);
    });
    const results:{category:string;recent:number;avg:number;percent:number}[]=[];
    Object.entries(byCategory).forEach(([category,data])=>{
      if(data.recent<=0)return;
      const weeksOfHistory=7;
      const avgWeekly=data.history.reduce((s,v)=>s+v,0)/weeksOfHistory;
      if(avgWeekly<=0)return;
      const percent=Math.round(((data.recent-avgWeekly)/avgWeekly)*100);
      if(percent>=30)results.push({category,recent:data.recent,avg:avgWeekly,percent});
    });
    return results.sort((a,b)=>b.percent-a.percent);
  },[transactions]);
  if(!anomalies.length)return null;
  return <section className="panel"><div className="section-title"><div><h2>Незвичні витрати</h2><p>Порівняно зі звичним темпом за останні 8 тижнів</p></div></div>
    <div className="anomaly-list">{anomalies.map(a=><div key={a.category} className="anomaly-item"><span className="anomaly-icon"><Sparkles size={14}/></span><div><strong>{a.category}</strong><small>Зазвичай {symbol}{formatMoney(a.avg)}/тиждень</small></div><b className="negative">+{a.percent}%</b></div>)}</div>
  </section>;
}
function CashflowCalendar({balance,recurring,transactions,rates,customRates,baseCurrency}:{balance:number;recurring:RecurringItem[];transactions:Transaction[];rates:{currency:string;rate:number}[];customRates:{currency:string;rate:number}[];baseCurrency:string}){
  const avgDailySpend=useMemo(()=>{
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
    const recent=transactions.filter(t=>t.amount<0&&t.kind!=="transfer"&&t.kind!=="exchange"&&t.bookedAt&&new Date(t.bookedAt)>=cutoff);
    const total=recent.reduce((sum,t)=>sum+Math.abs(t.baseAmount??t.amount),0);
    return total/30;
  },[transactions]);
  const [monthOffset,setMonthOffset]=useState(0);
  const today=new Date();
  const viewDate=new Date(today.getFullYear(),today.getMonth()+monthOffset,1);
  const year=viewDate.getFullYear(),month=viewDate.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstWeekday=(new Date(year,month,1).getDay()+6)%7;
  const symbol=currencySymbol(baseCurrency);

  const events=useMemo(()=>{
      const map:Record<string,{name:string;amount:number;kind:"income"|"expense"}[]>=Object.create(null);
      recurring.forEach(r=>{
        const anchor=new Date(r.next);
        const converted=r.amount*conversionRate(r.currency,rates,customRates)/conversionRate(baseCurrency,rates,customRates);
        const addEvent=(date:Date)=>{
          const key=date.toISOString().slice(0,10);
          if(!map[key])map[key]=[];
          map[key].push({name:r.name,amount:converted,kind:r.kind});
        };
        if(r.frequency==="monthly"){
          addEvent(new Date(year,month,Math.min(anchor.getDate(),daysInMonth)));
        } else if(r.frequency==="weekly"){
          const weekday=anchor.getDay();
          for(let d=1;d<=daysInMonth;d++){
            const date=new Date(year,month,d);
            if(date.getDay()===weekday)addEvent(date);
          }
        } else if(r.frequency==="yearly"&&anchor.getMonth()===month){
          addEvent(new Date(year,month,Math.min(anchor.getDate(),daysInMonth)));
        }
      });
      return map;
    },[recurring,rates,customRates,baseCurrency,year,month,daysInMonth]);

  const cells:{date:Date|null;key:string}[]=[];
  for(let i=0;i<firstWeekday;i++)cells.push({date:null,key:`pad-${i}`});
  for(let d=1;d<=daysInMonth;d++)cells.push({date:new Date(year,month,d),key:`d-${d}`});

  let running=balance;
  const runningByDay:Record<string,number>={};
  const isCurrentMonth=year===today.getFullYear()&&month===today.getMonth();
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(year,month,d);
    const key=date.toISOString().slice(0,10);
    if(!isCurrentMonth||d>=today.getDate()){
          const dayEvents=events[key]||[];
          dayEvents.forEach(e=>{running+=e.kind==="income"?e.amount:-e.amount});
          running-=avgDailySpend;
          runningByDay[key]=running;
        }
  }

  return <section className="panel full-view">
    <div className="section-title"><div><h2>Календар прогнозу</h2><p>Регулярні платежі + середні щоденні витрати (₴{formatMoney(avgDailySpend)}/день за останні 30 днів)</p></div>
      <div className="period-nav-row" style={{gridTemplateColumns:"auto auto auto",width:"auto",display:"flex",gap:8}}>
        <button type="button" className="period-nav-btn" onClick={()=>setMonthOffset(v=>v-1)}>← </button>
        <strong style={{alignSelf:"center",fontSize:13,textTransform:"capitalize"}}>{new Intl.DateTimeFormat("uk-UA",{month:"long",year:"numeric"}).format(viewDate)}</strong>
        <button type="button" className="period-nav-btn" onClick={()=>setMonthOffset(v=>v+1)}>→</button>
      </div>
    </div>
    <div className="cashflow-grid">
      {["Пн","Вт","Ср","Чт","Пт","Сб","Нд"].map(d=><div key={d} className="cashflow-weekday">{d}</div>)}
      {cells.map(cell=>{
        if(!cell.date)return <div key={cell.key} className="cashflow-cell empty"/>;
        const key=cell.date.toISOString().slice(0,10);
        const dayEvents=events[key]||[];
        const dayBalance=runningByDay[key];
        const isPast=isCurrentMonth&&cell.date.getDate()<today.getDate();
        const isDanger=dayBalance!==undefined&&dayBalance<0;
        return <div key={cell.key} className={`cashflow-cell${isPast?" past":""}${isDanger?" danger":""}`}>
          <span className="cashflow-day">{cell.date.getDate()}</span>
          {dayEvents.map((e,i)=><div key={i} className={e.kind==="income"?"cashflow-event income":"cashflow-event"}>{e.kind==="income"?"+":"−"}{symbol}{formatMoney(e.amount)}</div>)}
          {dayBalance!==undefined && <div className="cashflow-balance">{symbol}{formatMoney(dayBalance)}</div>}
        </div>;
      })}
    </div>
    {Object.values(runningByDay).some(v=>v<0) && <div className="alert-card"><Bell/><div><strong>Можливий касовий розрив</strong><p>В окремі дні цього місяця прогнозований баланс іде в мінус.</p></div></div>}
  </section>;
}
function DebtsView({debts,add,settle,payOff,openPay,splitBill}:{debts:DebtItem[];add:()=>void;settle:(debt:DebtItem)=>void;payOff:(accountId:string)=>void;openPay:(debt:DebtItem)=>void;splitBill:()=>void}) { const mine=debts.filter(d=>d.direction==="owed_to_me");const owe=debts.filter(d=>d.direction==="i_owe");return <section className="panel full-view"><div className="section-title"><div><h2>Борги та кредити</h2><p>Хто винен мені та кому винна я</p></div><div className="title-actions"><button className="secondary" onClick={splitBill}><HandCoins/> Розділити чек</button><button className="small-primary" onClick={add}><Plus/> Додати борг</button></div></div><div className="debt-summary"><article><ArrowDownLeft/><div><small>Мені винні</small><strong>{currencySymbol("UAH")} {formatMoney(mine.reduce((s,d)=>s+d.amount,0))}</strong></div></article><article><ArrowUpRight/><div><small>Я винна</small><strong>{currencySymbol("UAH")} {formatMoney(owe.reduce((s,d)=>s+d.amount,0))}</strong></div></article></div><div className="debt-list">{debts.map(d=><div key={d.id}><span className={d.direction==="owed_to_me"?"debt-in":"debt-out"}>{d.direction==="owed_to_me"?<ArrowDownLeft/>:<ArrowUpRight/>}</span><div><strong>{d.person}</strong><small>{d.note||"Без нотатки"}{d.due?` · до ${new Date(d.due).toLocaleDateString("uk-UA")}`:""}</small></div><b>{d.currency} {formatMoney(d.amount)}</b>{d.isVirtual?<button className="small-primary" onClick={()=>d.accountId&&payOff(d.accountId)}>Погасити</button>:d.isInstallment&&d.direction==="i_owe"?<><button className="small-primary" onClick={()=>openPay(d)}>Погасити</button><button className="icon-button danger" onClick={()=>settle(d)}><Trash2 size={14}/></button></>:<button onClick={()=>settle(d)}>Закрити</button>}</div>)}{!debts.length&&<p className="empty">Активних боргів немає</p>}</div></section>; }
function SettingsView({dark,setDark,skin,setSkin,cardStyle,setCardStyle,logout,notify,importCsv,categories,audit,addCategory,deleteCategory,pushEnabled,enablePush,installApp,goals,budgets,debts,transactions,rules,openAddRule,removeRule}:{dark:boolean;setDark:(v:boolean)=>void;skin:string;setSkin:(v:string)=>void;cardStyle:string;setCardStyle:(v:string)=>void;logout:()=>void;notify:(s:string)=>void;importCsv:(file:File)=>void;categories:CategoryItem[];audit:AuditItem[];addCategory:()=>void;deleteCategory:(id:string)=>void;pushEnabled:boolean;enablePush:()=>void;installApp:()=>void;goals:GoalItem[];budgets:BudgetItem[];debts:DebtItem[];transactions:Transaction[];rules:RuleItem[];openAddRule:()=>void;removeRule:(id:string)=>void}) {
  return <><div className="settings-grid"><ProfileSettings dark={dark} setDark={setDark} skin={skin} setSkin={setSkin} cardStyle={cardStyle} setCardStyle={setCardStyle} notify={notify}/><section className="panel settings-card"><h2>Застосунок та інтеграції</h2><button className="integration" onClick={installApp}><Download/><span><strong>Встановити Rivna</strong><small>На домашній екран iOS, Android або ПК</small></span><ArrowRight/></button><button className="integration" onClick={enablePush}><Bell/><span><strong>{pushEnabled?"Сповіщення увімкнено":"Увімкнути сповіщення"}</strong><small>Алерти 80% і 100% бюджету</small></span><ArrowRight/></button><label className="integration file-integration"><Upload/><span><strong>Імпорт даних</strong><small>CSV до 5 МБ</small></span><ArrowRight/><input type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)importCsv(file);event.target.value=""}}/></label><button className="integration" onClick={()=>notify("Telegram chat ID зберігається у блоці «Загальні»")}><Goal/><span><strong>Telegram-бот</strong><small>Команда: 300 кава #робота</small></span><ArrowRight/></button><button className="logout" onClick={logout}>Вийти з акаунта</button></section></div>
    <div className="settings-lower"><AchievementsPanel goals={goals} budgets={budgets} debts={debts} transactions={transactions}/><RulesPanel rules={rules} addRule={openAddRule} removeRule={removeRule}/><section className="panel"><div className="section-title"><div><h2>Категорії</h2><p>Власні назви, кольори та Lucide-іконки</p></div><button className="small-primary" onClick={addCategory}><Plus/> Категорія</button></div><div className="category-manager">{categories.map(category=><div key={category.id}><span style={{background:category.color}}/><strong>{category.name}</strong><small>{category.kind==="income"?"Дохід":"Витрата"}</small><button onClick={()=>deleteCategory(category.id)}><Trash2/></button></div>)}</div></section><section className="panel"><div className="section-title"><div><h2>Історія змін</h2><p>Останні ключові дії</p></div></div><div className="audit-list">{audit.slice(0,12).map(item=><div key={item.id}><span>{item.action==="insert"?"+":item.action==="delete"?"−":"↻"}</span><div><strong>{translateEntity(item.entity)}</strong><small>{translateAction(item.action)} · {new Date(item.created).toLocaleString("uk-UA")}</small></div></div>)}{!audit.length&&<p className="empty-inline">Історія з’явиться після змін у Supabase</p>}</div></section></div></>
}

type SettingsProfile={name:string;email:string;baseCurrency:string;planningPeriod:"month"|"week";householdName:string;telegramChatId:string;recurringReminders:boolean;budget80:boolean;budget100:boolean;role:string;digestEnabled?:boolean;digestFrequency?:"weekly"|"monthly"};
const ACHIEVEMENTS=[
  {id:"first-goal",label:"Перша банка",desc:"Створи фінансову ціль",icon:PiggyBank,check:(ctx:AchievementContext)=>ctx.goals.length>0},
  {id:"goal-closed",label:"Ціль досягнута",desc:"Накопич повну суму хоча б однієї цілі",icon:Check,check:(ctx:AchievementContext)=>ctx.goals.some(g=>g.current>=g.target)},
  {id:"budget-master",label:"Місяць без перевищень",desc:"Не перевищуй жоден ліміт бюджету за місяць",icon:BarChart3,check:(ctx:AchievementContext)=>ctx.budgets.length>0&&ctx.budgets.every(b=>{const spent=ctx.spentByCategory[b.name]||0;return spent<=b.limit}),},
  {id:"debt-free",label:"Без боргів",desc:"Закрий усі свої борги",icon:HandCoins,check:(ctx:AchievementContext)=>ctx.debts.length>0&&ctx.debts.every(d=>d.direction==="owed_to_me")},
  {id:"streak-10",label:"10 операцій",desc:"Додай 10 операцій в застосунку",icon:Sparkles,check:(ctx:AchievementContext)=>ctx.transactions.length>=10},
  {id:"tracker",label:"Місяць з rivna",desc:"Користуйся застосунком місяць поспіль",icon:Target,check:(ctx:AchievementContext)=>ctx.oldestTransactionDays>=30},
];
type AchievementContext={goals:GoalItem[];budgets:BudgetItem[];debts:DebtItem[];transactions:Transaction[];spentByCategory:Record<string,number>;oldestTransactionDays:number};
function AchievementsPanel({goals,budgets,debts,transactions}:{goals:GoalItem[];budgets:BudgetItem[];debts:DebtItem[];transactions:Transaction[]}){
  const ctx=useMemo<AchievementContext>(()=>{
    const now=new Date();
    const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const spentByCategory:Record<string,number>=transactions.filter(t=>t.amount<0&&t.kind!=="transfer"&&t.kind!=="exchange"&&t.bookedAt?.startsWith(monthKey)).reduce((sum,t)=>{sum[t.category]=(sum[t.category]||0)+Math.abs(t.amount);return sum},{} as Record<string,number>);
    const monthBudgets=budgets.filter(b=>b.month.startsWith(monthKey));
    const oldest=transactions.reduce((min,t)=>{if(!t.bookedAt)return min;const d=new Date(t.bookedAt).getTime();return d<min?d:min},Date.now());
    const oldestTransactionDays=Math.floor((Date.now()-oldest)/86400000);
    return {goals,budgets:monthBudgets,debts,transactions,spentByCategory,oldestTransactionDays};
  },[goals,budgets,debts,transactions]);
  return <section className="panel"><div className="section-title"><div><h2>Досягнення</h2><p>Твій прогрес у фінансовій дисципліні</p></div></div>
    <div className="achievements-grid">{ACHIEVEMENTS.map(a=>{const unlocked=a.check(ctx);const Icon=a.icon;return <div key={a.id} className={unlocked?"achievement-badge unlocked":"achievement-badge"}><span className="achievement-icon"><Icon size={20}/></span><strong>{a.label}</strong><small>{a.desc}</small></div>})}</div>
  </section>;
}
function RulesPanel({rules,addRule,removeRule}:{rules:RuleItem[];addRule:()=>void;removeRule:(id:string)=>void}){
  const conditionLabels:Record<string,string>={amount_gt:"Сума більше",amount_lt:"Сума менше",no_category:"Без категорії",currency_is:"Валюта дорівнює"};
  const actionLabels:Record<string,string>={set_category:"Встановити категорію",contribute_goal_percent:"% доходу в банку"};
  return <section className="panel"><div className="section-title"><div><h2>Автоматичні правила</h2><p>Обробка транзакцій за умовами</p></div><button className="small-primary" onClick={addRule}><Plus/> Правило</button></div>
    <div className="category-manager">{rules.map(r=><div key={r.id}><span style={{background:"var(--purple)"}}/><strong>{r.name}</strong><small>{conditionLabels[r.conditionType]||r.conditionType}{r.conditionValue?` ${r.conditionValue}`:""} → {actionLabels[r.actionType]||r.actionType}</small><button onClick={()=>removeRule(r.id)}><Trash2/></button></div>)}{!rules.length&&<p className="empty-inline">Правил ще немає</p>}</div>
  </section>;
}
function InvestmentSimulator({goals,baseCurrency}:{goals:GoalItem[];baseCurrency:string}){
  const [initial,setInitial]=useState("10000");
  const [monthly,setMonthly]=useState("2000");
  const [rate,setRate]=useState("12");
  const [years,setYears]=useState("5");
  const [linkedGoal,setLinkedGoal]=useState("");
  const symbol=currencySymbol(baseCurrency);
  const points=useMemo(()=>{
    const monthlyRate=Number(rate)/100/12;
    const totalMonths=Number(years)*12;
    let capital=Number(initial)||0;
    const contributed=Number(initial)||0;
    let totalContributed=contributed;
    const result:{month:number;capital:number;contributed:number}[]=[{month:0,capital,contributed:totalContributed}];
    for(let m=1;m<=totalMonths;m++){
      capital=capital*(1+monthlyRate)+(Number(monthly)||0);
      totalContributed+=Number(monthly)||0;
      if(m%Math.max(1,Math.round(totalMonths/24))===0||m===totalMonths)result.push({month:m,capital,contributed:totalContributed});
    }
    return result;
  },[initial,monthly,rate,years]);
  const final=points[points.length-1];
  const profit=final?final.capital-final.contributed:0;
  const maxCapital=Math.max(...points.map(p=>p.capital),1);
  const selectedGoal=goals.find(g=>g.id===linkedGoal);

  return <section className="panel full-view">
    <div className="section-title"><div><h2>Симулятор накопичень</h2><p>Розрахунок складеного відсотка</p></div></div>
    <div className="wizard-grid sim-fields" style={{marginBottom:16}}>
      <label>Початковий внесок<input type="number" min="0" value={initial} onChange={e=>setInitial(e.target.value)}/></label>
      <label>Щомісячне поповнення<input type="number" min="0" value={monthly} onChange={e=>setMonthly(e.target.value)}/></label>
      <label>% річних<input type="number" min="0" step=".1" value={rate} onChange={e=>setRate(e.target.value)}/></label>
      <label>Термін, роки<input type="number" min="1" max="40" value={years} onChange={e=>setYears(e.target.value)}/></label>
    </div>
    {goals.length>0 && <label>Прив'язати до цілі (необов'язково)<select value={linkedGoal} onChange={e=>setLinkedGoal(e.target.value)}><option value="">Не прив'язано</option>{goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
    <div className="metric-grid" style={{marginTop:16}}>
      <article className="metric"><small>Підсумковий капітал</small><strong>{symbol} {formatMoney(final?.capital||0)}</strong><span>За {years} р.</span></article>
      <article className="metric"><small>Всього внесено</small><strong>{symbol} {formatMoney(final?.contributed||0)}</strong><span>Твої гроші</span></article>
      <article className="metric"><small>Прибуток від відсотків</small><strong className="income-amount">{symbol} {formatMoney(profit)}</strong><span className="positive">Заробили відсотки</span></article>
    </div>
    <div className="monthly-chart" style={{marginTop:20}}>{points.map((p,i)=><div key={i}><strong>{i===points.length-1?`${symbol}${formatMoney(p.capital)}`:""}</strong><span><i style={{height:`${Math.max(3,p.capital/maxCapital*100)}%`}}/></span><small>{i%2===0?`${Math.round(p.month/12*10)/10}р`:""}</small></div>)}</div>
    {selectedGoal && <div className="form-message success">При такому темпі ти досягнеш цілі "{selectedGoal.name}" ({symbol} {formatMoney(selectedGoal.target)}) приблизно за {(()=>{const target=selectedGoal.target;const found=points.find(p=>p.capital>=target);return found?`${Math.round(found.month/12*10)/10} років`:`понад ${years} років`})()}.</div>}
  </section>;
}
function BigPurchaseSimulator({balance,recurring,rates,customRates,baseCurrency,close}:{balance:number;recurring:RecurringItem[];rates:{currency:string;rate:number}[];customRates:{currency:string;rate:number}[];baseCurrency:string;close:()=>void}){
  const [amount,setAmount]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const symbol=currencySymbol(baseCurrency);
  const purchaseDate=new Date(date);
  const today=new Date();
  const daysUntil=Math.max(0,Math.round((purchaseDate.getTime()-today.getTime())/86400000));
  const monthlyObligations=recurring.filter(r=>r.kind==="expense").reduce((sum,r)=>sum+r.amount*conversionRate(r.currency,rates,customRates)/conversionRate(baseCurrency,rates,customRates),0);
  const monthsUntil=Math.max(0,daysUntil/30);
  const projectedObligations=monthlyObligations*monthsUntil;
  const balanceAfterPurchase=balance-projectedObligations-(Number(amount)||0);
  const canAfford=balanceAfterPurchase>=0;
  const bufferMonths=monthlyObligations>0?balanceAfterPurchase/monthlyObligations:0;

  return <div className="modal-backdrop" onMouseDown={close}><div className="expense-modal tall-modal" onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Планування" title="Симулятор великої покупки" close={close}/>
    <div className="form-two">
      <label>Сума покупки<input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <label>Дата<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    </div>
    <div className="metric-grid" style={{marginTop:16}}>
      <article className="metric"><small>Баланс станом на дату</small><strong>{symbol} {formatMoney(balance-projectedObligations)}</strong><span>До покупки, з урахуванням платежів</span></article>
      <article className="metric"><small>Залишок після покупки</small><strong className={canAfford?"":"negative"}>{symbol} {formatMoney(balanceAfterPurchase)}</strong><span className={canAfford?"positive":"negative"}>{canAfford?"Вистачає":"Може не вистачити"}</span></article>
      <article className="metric"><small>Запас на обов'язкові платежі</small><strong>{bufferMonths>=0?`${Math.round(bufferMonths*10)/10} міс.`:"—"}</strong><span>Після покупки</span></article>
    </div>
    <div className={canAfford?"form-message success":"form-message error"}>
      {canAfford
        ?`Після покупки на ${symbol}${formatMoney(Number(amount)||0)} у тебе залишиться ${symbol}${formatMoney(balanceAfterPurchase)} — цього вистачить приблизно на ${Math.max(0,Math.round(bufferMonths*10)/10)} місяців обов'язкових платежів.`
        :`Цієї покупки зараз може не вистачити коштів: бракує ${symbol}${formatMoney(Math.abs(balanceAfterPurchase))} з урахуванням запланованих платежів до ${new Date(date).toLocaleDateString("uk-UA")}.`}
    </div>
  </div></div>;
}
function WrappedModal({transactions,goals,baseCurrency,close}:{transactions:Transaction[];goals:GoalItem[];baseCurrency:string;close:()=>void}){
  const [cardIndex,setCardIndex]=useState(0);
  const cardRef=useRef<HTMLDivElement>(null);
  const symbol=currencySymbol(baseCurrency);
  const now=new Date();
  const monthLabel=new Intl.DateTimeFormat("uk-UA",{month:"long",year:"numeric"}).format(now);

  const stats=useMemo(()=>{
    const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const monthExpenses=transactions.filter(t=>t.amount<0&&t.kind!=="transfer"&&t.kind!=="exchange"&&t.bookedAt?.startsWith(monthKey));
    const byCategory:Record<string,number>={};
    monthExpenses.forEach(t=>{byCategory[t.category]=(byCategory[t.category]||0)+Math.abs(t.baseAmount??t.amount)});
    const favoriteCategory=Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];
    const biggestPurchase=monthExpenses.sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount))[0];
    const totalSpent=monthExpenses.reduce((sum,t)=>sum+Math.abs(t.baseAmount??t.amount),0);
    const totalSaved=goals.reduce((sum,g)=>sum+g.current,0);
    const transactionCount=monthExpenses.length;
    return {favoriteCategory,biggestPurchase,totalSpent,totalSaved,transactionCount};
  },[transactions,goals,now]);

  const cards=[
    {title:"Твій місяць у rivna",subtitle:monthLabel,big:`${symbol} ${formatMoney(stats.totalSpent)}`,label:"Витрачено загалом",color:"#6B2D42"},
    {title:"Категорія-фаворит",subtitle:"Найбільше пішло сюди",big:stats.favoriteCategory?.[0]||"—",label:stats.favoriteCategory?`${symbol} ${formatMoney(stats.favoriteCategory[1])}`:"Ще немає даних",color:"#8A6A4A"},
    {title:"Найбільша покупка",subtitle:stats.biggestPurchase?.date||"",big:stats.biggestPurchase?`${symbol} ${formatMoney(Math.abs(stats.biggestPurchase.amount))}`:"—",label:stats.biggestPurchase?.title||"Ще немає даних",color:"#3B6D11"},
    {title:"Відкладено в банки",subtitle:"Загальні накопичення",big:`${symbol} ${formatMoney(stats.totalSaved)}`,label:`${goals.length} ${goals.length===1?"ціль":"цілей"}`,color:"#4C91E8"},
    {title:"Операцій за місяць",subtitle:"Твоя активність",big:String(stats.transactionCount),label:"записів у rivna",color:"#D85A30"},
  ];
  const card=cards[cardIndex];

  async function saveAsImage(){
    if(!cardRef.current)return;
    const html2canvas=(await import("html2canvas")).default;
    const canvas=await html2canvas(cardRef.current,{backgroundColor:null,scale:2});
    const link=document.createElement("a");
    link.download=`rivna-wrapped-${cardIndex+1}.png`;
    link.href=canvas.toDataURL("image/png");
    link.click();
  }

  return <div className="modal-backdrop" onMouseDown={close}><div className="wrapped-wrap" onMouseDown={e=>e.stopPropagation()}>
    <button className="icon-button" style={{position:"absolute",top:16,right:16,color:"#fff",zIndex:5}} onClick={close}><X/></button>
    <div ref={cardRef} className="wrapped-card" style={{background:`linear-gradient(150deg,${card.color} 0%,#1a1a1a 100%)`}}>
      <span className="wrapped-brand">rivna</span>
      <small>{card.subtitle}</small>
      <h2>{card.title}</h2>
      <strong>{card.big}</strong>
      <p>{card.label}</p>
      <div className="wrapped-dots">{cards.map((_,i)=><i key={i} className={i===cardIndex?"active":""}/>)}</div>
    </div>
    <div className="wrapped-actions">
      <button className="period-nav-btn" onClick={()=>setCardIndex(i=>Math.max(0,i-1))} disabled={cardIndex===0}>← Назад</button>
      <button className="secondary" onClick={saveAsImage}><Download/> Зберегти</button>
      <button className="period-nav-btn" onClick={()=>setCardIndex(i=>Math.min(cards.length-1,i+1))} disabled={cardIndex===cards.length-1}>Вперед →</button>
    </div>
  </div></div>;
}
function SettlementPanel({baseCurrency,createDebt}:{baseCurrency:string;createDebt:(person:string,amount:number)=>void}){
  const [balances,setBalances]=useState<{person:string;amount:number}[]>([]);
  useEffect(()=>{fetch("/api/finance/splits").then(r=>r.ok?r.json():null).then(data=>setBalances(data?.balances||[])).catch(()=>{})},[]);
  const symbol=currencySymbol(baseCurrency);
  if(!balances.length)return null;
  return <section className="panel"><div className="section-title"><div><h2>Спільний бюджет цього місяця</h2><p>Хто скільки має доплатити за розділені чеки</p></div></div>
    <div className="recurring-list">{balances.map(b=><div key={b.person}><span className="recurring-icon"><HandCoins/></span><strong>{b.person}</strong><small>Спільні витрати цього місяця</small><b>{symbol} {formatMoney(b.amount)}</b><button className="small-primary" onClick={()=>createDebt(b.person,b.amount)}>Створити борг</button></div>)}</div>
  </section>;
}
function ProfileSettings({dark,setDark,skin,setSkin,cardStyle,setCardStyle,notify}:{dark:boolean;setDark:(value:boolean)=>void;skin:string;setSkin:(value:string)=>void;cardStyle:string;setCardStyle:(value:string)=>void;notify:(message:string)=>void}){
  const [profile,setProfile]=useState<SettingsProfile|null>({name:"Марія",email:"",baseCurrency:"UAH",planningPeriod:"month",householdName:"Мої фінанси",telegramChatId:"",recurringReminders:true,budget80:true,budget100:true,role:"owner"});
  useEffect(()=>{fetch("/api/settings",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>data?.profile&&setProfile(data.profile)).catch(()=>{})},[]);
  async function save(e:React.SyntheticEvent<HTMLFormElement>){
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
    <label className="setting-toggle"><span><strong>Алерт на 100%</strong><small>Повідомлення про вичерпаний ліміт</small></span><input type="checkbox" checked={profile?.budget100??true} onChange={(e) => setProfile((prevProfile) => (prevProfile ? { ...prevProfile, budget100: e.target.checked } : prevProfile))}/></label>
    <label className="setting-toggle"><span><strong>Нагадування про платежі</strong><small>Для неавтоматичних правил</small></span><input type="checkbox" checked={profile?.recurringReminders??true} onChange={e=>setProfile(p=>p?{...p,recurringReminders:e.target.checked}:p)}/></label>
    <label className="setting-toggle"><span><strong>Тижневий/місячний звіт у Telegram</strong><small>Дайджест витрат, бюджету та накопичень</small></span><input type="checkbox" checked={profile?.digestEnabled??false} onChange={e=>setProfile(p=>p?{...p,digestEnabled:e.target.checked}:p)}/></label>
    {profile?.digestEnabled && <label>Частота звіту<select value={profile?.digestFrequency||"weekly"} onChange={e=>setProfile(p=>p?{...p,digestFrequency:e.target.value as "weekly"|"monthly"}:p)}><option value="weekly">Щотижня</option><option value="monthly">Щомісяця</option></select></label>}
    <label className="setting-toggle"><span><strong>Темна тема</strong><small>Змінити вигляд застосунку</small></span><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/></label>
    <label>Кольорова тема
          <div className="skin-picker">
            <button type="button" className={`skin-swatch${skin==="default"?" active":""}`} onClick={()=>setSkin("default")}><i style={{background:"#171a18"}}/><small>Поточна</small></button>
            <button type="button" className={`skin-swatch${skin==="mulberry-mint"?" active":""}`} onClick={()=>setSkin("mulberry-mint")}><i style={{background:"#6B2D42"}}/><small>Mulberry mint</small></button>
            <button type="button" className={`skin-swatch${skin==="espresso-cream"?" active":""}`} onClick={()=>setSkin("espresso-cream")}><i style={{background:"#8A6A4A"}}/><small>Espresso cream</small></button>
          </div>
        </label>
        <label>Дизайн картки балансу
          <div className="skin-picker">
            <button type="button" className={`skin-swatch${cardStyle==="default"?" active":""}`} onClick={()=>setCardStyle("default")}><i style={{background:"linear-gradient(120deg,#12151a,#242832)"}}/><small>Класична</small></button>
            <button type="button" className={`skin-swatch${cardStyle==="aurora"?" active":""}`} onClick={()=>setCardStyle("aurora")}><i style={{background:"linear-gradient(135deg,#1b1233,#3a2a63)"}}/><small>Аврора</small></button>
            <button type="button" className={`skin-swatch${cardStyle==="mesh"?" active":""}`} onClick={()=>setCardStyle("mesh")}><i style={{background:"radial-gradient(circle at 30% 30%,#2c2450,#1a3a3a)"}}/><small>Меш</small></button>
            <button type="button" className={`skin-swatch${cardStyle==="minimal"?" active":""}`} onClick={()=>setCardStyle("minimal")}><i style={{background:"#171a18"}}/><small>Мінімал</small></button>
          </div>
        </label>
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
  async function submit(e:React.SyntheticEvent){e.preventDefault();if(!authenticated)return notify("Відгук можна надіслати після входу");setSending(true);const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating,message})});const result=await response.json();setSending(false);if(response.ok){setMessage("");notify("Дякуємо за відгук")}else notify(result.error||"Не вдалося надіслати")}
  return <section className="guide-grid"><div className="panel guide-card"><div className="section-title"><div><h2>Короткий довідник</h2><p>Як швидко почати роботу з Rivna</p></div></div><ol><li><span>1</span><div><strong>Додайте рахунки</strong><small>Картки, готівку та валютні заощадження.</small></div></li><li><span>2</span><div><strong>Записуйте витрати</strong><small>Теги, поділ чека та повторення доступні в одній формі.</small></div></li><li><span>3</span><div><strong>Встановіть ліміти</strong><small>Rivna попередить на 80% та 100% бюджету.</small></div></li><li><span>4</span><div><strong>Підключіть Telegram</strong><small>Збережіть chat ID і пишіть боту: «300 кава».</small></div></li><li><span>5</span><div><strong>Залиште відгук</strong><small>Допоможіть зробити Rivna кращою.</small></div></li></ol></div><form className="panel feedback-card" onSubmit={submit}><span className="wizard-icon"><Sparkles/></span><h2>Допоможіть зробити Rivna кращою</h2><p>Що зручно, а що варто змінити?</p><div className="rating-row">{[1,2,3,4,5].map(value=><button type="button" key={value} className={value<=rating?"active":""} onClick={()=>setRating(value)}>★</button>)}</div><textarea value={message} onChange={event=>setMessage(event.target.value)} placeholder="Ваш відгук…" required minLength={3}/><button className="primary" disabled={sending}>{sending?"Надсилаємо…":"Надіслати відгук"}</button></form></section>
}

function AccountCard({account}:{account:Account}) {
  const [renderedAt]=useState(()=>Date.now()),days=account.graceEnd?Math.ceil((new Date(account.graceEnd).getTime()-renderedAt)/86400000):null;
  const available = (account.balance||0) + (account.creditLimit || 0);
  const light=isLight(account.color);
  const ink=account.color?(light?'#000':'#fff'):'#fff';
  const muted=account.color?(light?'rgba(0,0,0,.6)':'rgba(255,255,255,.6)'):undefined;
  return <article className={`account ${bankStyle(account.bank)}`} style={account.cardImage?{backgroundImage:`url(${account.cardImage})`,backgroundSize:"cover",backgroundPosition:"center",color:"#fff"}:account.color?{background:account.color, color: ink}:undefined}>
    <div className="card-top">
      <BankMark bank={account.bank}/>
      <div className="card-top-right">
        {days!==null&&<em className={days<=7?"grace urgent":"grace"}>{days>=0?`${days} дн. грейсу`:"Грейс минув"}</em>}
        <span className="card-contactless"><Wifi/></span>
      </div>
    </div>
    <div className="card-footer" style={{marginTop:"22px"}}>
      <div><small style={muted?{color:muted}:undefined}>Власник</small><strong>{account.owner||"—"}</strong></div>
      <div className="card-balance"><small style={muted?{color:muted}:undefined}>Доступно</small><strong className="card-amount">{currencySymbol(account.currency)} {formatMoney(available)}</strong></div>
    </div>
    {(account.creditLimit||0) > 0 && <div className="card-credit" style={muted?{color:muted}:undefined}>Використано: {formatMoney(Math.min(0,account.balance))} з {formatMoney(account.creditLimit ?? 0)}</div>}
    <div className="card-nickname" style={muted?{color:muted}:undefined}>{account.name} · {account.bank}</div>
  </article>;
}
function BankMark({bank}:{bank:string}){const value=bank.toLowerCase();if(value.includes("mono"))return <span className="bank-logo mono-logo">mono</span>;if(value.includes("приват")||value.includes("privat"))return <span className="bank-logo privat-logo">П</span>;if(value.includes("пумб")||value.includes("pumb"))return <span className="bank-logo pumb-logo">ПУМБ</span>;if(value.includes("ощад"))return <span className="bank-logo oschad-logo">О</span>;if(value.includes("райффайзен")||value.includes("raiffeisen"))return <span className="bank-logo raif-logo">RAIFF</span>;if(value.includes("а-банк")||value.includes("abank"))return <span className="bank-logo abank-logo">А-Банк</span>;if(value.includes("сенс")||value.includes("sense"))return <span className="bank-logo sense-logo">Sense</span>;if(value.includes("укрсиб")||value.includes("ukrsib"))return <span className="bank-logo ukrsib-logo">УСБ</span>;if(value.includes("отп")||value.includes("otp"))return <span className="bank-logo otp-logo">OTP</span>;if(value.includes("кредо")||value.includes("kredo"))return <span className="bank-logo kredo-logo">Kredo</span>;if(value.includes("пайонер")||value.includes("піонер")||value.includes("payoneer"))return <span className="bank-logo pioneer-logo">Payoneer</span>;if(value.includes("готів"))return <span className="bank-icon"><Landmark/></span>;return <span className="bank-icon">{bank.slice(0,1).toUpperCase()||<CreditCard/>}</span>}
function bankStyle(bank:string,index=2){const value=bank.toLowerCase();if(value.includes("mono"))return "mono";if(value.includes("приват")||value.includes("privat"))return "privat";if(value.includes("пумб")||value.includes("pumb"))return "pumb";if(value.includes("ощад"))return "oschad";if(value.includes("райффайзен")||value.includes("raiffeisen"))return "raif";if(value.includes("а-банк")||value.includes("abank"))return "abank";if(value.includes("сенс")||value.includes("sense"))return "sense";if(value.includes("укрсиб")||value.includes("ukrsib"))return "ukrsib";if(value.includes("отп")||value.includes("otp"))return "otp";if(value.includes("кредо")||value.includes("kredo"))return "kredo";if(value.includes("пайонер")||value.includes("піонер")||value.includes("pioneer"))return "pioneer";return index%3===0?"mono":index%3===1?"privat":"stash"}
function TransactionList({transactions}:{transactions:Transaction[]}) { return <div className="tx-list">{transactions.map(t=><div className="tx" key={t.id}><span className={`tx-icon ${t.amount>0?"income":"shop"}`}>{t.amount>0?<ArrowDownLeft/>:<ShoppingBag/>}</span><div className="tx-info"><strong>{t.title}{t.impulse&&<em>Імпульсивна</em>}</strong><small>{t.category} · {t.date}</small></div><strong className={t.amount>0?"income-amount":""}>{t.amount>0?"+":"−"} {currencySymbol(t.currency||"UAH")} {formatMoney(t.amount)}</strong></div>)}</div>; }
function EmptyState({icon,text}:{icon:React.ReactNode;text:string}){
  return <div className="empty-state"><span className="empty-state-icon">{icon}</span><p>{text}</p></div>;
}
function ExpenseModal({amount,setAmount,note,setNote,accounts,categories,debts,submit,close}:{amount:string;setAmount:(s:string)=>void;note:string;setNote:(s:string)=>void;accounts:Account[];categories:CategoryItem[];debts:DebtItem[];submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [debtId,setDebtId]=useState("");  const [type,setType]=useState<"expense"|"income">("expense"),[accountId,setAccountId]=useState(String(accounts[0]?.id||"")),[categoryId,setCategoryId]=useState("");
  const [repeat,setRepeat]=useState(false);
  const account=accounts.find(item=>String(item.id)===accountId)||accounts[0];
  const accountOptions=accounts.map(item=>({value:String(item.id),label:`${item.name} · ${item.currency}`}));
  function changeType(next:"expense"|"income"){setType(next);setCategoryId("")}
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal tall-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}>
    <ModalHead label="Деталізація операції" title={type==="income"?"Новий дохід":"Нова витрата"} close={close}/>
    <div className="operation-type"><button type="button" className={type==="expense"?"active":""} onClick={()=>changeType("expense")}><ArrowUpRight/> Витрата</button><button type="button" className={type==="income"?"active":""} onClick={()=>changeType("income")}><ArrowDownLeft/> Дохід</button></div>
    <input type="hidden" name="type" value={type}/>
    <label className="amount-field"><span>{currencySymbol(account?.currency||"UAH")}</span><input autoFocus required inputMode="decimal" placeholder="0" value={amount} onChange={event=>setAmount(event.target.value)} onBlur={()=>{const evaluated=evaluateExpression(amount);if(evaluated!==null)setAmount(String(evaluated))}}/></label>
    <WheelField name="account" label="Рахунок" options={accountOptions} value={accountId} onChange={setAccountId}/>
    <CategoryGridField categories={categories} type={type} value={categoryId} onChange={setCategoryId}/>
    <label>Валюта<input name="currency" value={account?.currency||"UAH"} readOnly/></label>
    <DateWheelField name="date"/>
    <details className="split-details" open={repeat}><summary>{type==="income"?"Плановий дохід":"Повторювати витрату"}</summary><label className="check impulse"><input name="repeat" type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/> {type==="income"?"Позначити як регулярний дохід":"Створити регулярне нагадування"}</label><div className="form-two"><label>Період<select name="repeatFrequency"><option value="weekly">Щотижня</option><option value="monthly">Щомісяця</option><option value="yearly">Щороку</option></select></label><label>Число місяця<input name="repeatDay" type="number" min="1" max="28" placeholder="Наприклад, 5"/></label></div></details>
    <label>Нотатка<input placeholder={type==="income"?"Наприклад, зарплата":"Наприклад, кава"} value={note} onChange={event=>setNote(event.target.value)}/></label>
    <label>Теги<input name="tags" placeholder="#відпустка #робота"/></label>
    {type==="expense"&&<>
      {debts.length>0&&<details className="split-details"><summary>Погашення боргу</summary><label>Борг<select value={debtId} onChange={e=>setDebtId(e.target.value)}><option value="">Не пов'язано з боргом</option>{debts.map(d=><option key={d.id} value={d.id}>{d.person} · {d.currency} {formatMoney(d.amount)}</option>)}</select></label><input type="hidden" name="debtId" value={debtId}/><small className="field-help">Сума цієї витрати спишеться з залишку обраного боргу — підходить і для планового, і для дострокового погашення.</small></details>}
      <details className="split-details"><summary>Розділити чек</summary><div className="form-two"><label>Загальна сума<input name="splitTotal" type="number" min="0" step=".01"/></label><label>Моя частка<input name="personalShare" type="number" min="0" step=".01"/></label></div><label>Учасники<input name="splitParticipants" placeholder="Діма, Оля, Андрій"/></label><small className="field-help">Залишок буде порівну розподілений між учасниками, а з балансу спишеться лише ваша частка.</small></details>
      <label className="check impulse"><input name="impulse" type="checkbox"/> Імпульсивна витрата</label>
    </>}
    <button className="primary">{type==="income"?"Додати дохід":"Додати витрату"}</button>
  </form></div>;
}
function WheelField({name,label,options,value:controlled,onChange,defaultValue}:{name:string;label:string;options:{value:string;label:string}[];value?:string;onChange?:(value:string)=>void;defaultValue?:string}){const [internal,setInternal]=useState(defaultValue??options[0]?.value??""),value=controlled===undefined?internal:controlled,selected=options.find(option=>option.value===value);function select(next:string){if(controlled===undefined)setInternal(next);onChange?.(next)}return <label className="picker-label">{label}<details className="compact-picker"><summary>{selected?.label||"Оберіть"}</summary><div className="picker-wheel">{options.map(option=><button type="button" key={`${name}-${option.value}`} className={option.value===value?"selected":""} onClick={event=>{select(option.value);event.currentTarget.closest("details")?.removeAttribute("open")}}>{option.label}{option.value===value&&<Check/>}</button>)}</div></details><input type="hidden" name={name} value={value}/></label>}
function CategoryGridField({categories,type,value,onChange}:{categories:CategoryItem[];type:"expense"|"income";value:string;onChange:(v:string)=>void}){
  const seen=new Set<string>();
  const normalize=(name:string)=>name.trim().toLowerCase().replace(/['’ʼ`]/g,"");
  const filtered=categories.filter(c=>c.kind===type).filter(c=>{
    const key=normalize(c.name);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
  return <div className="category-grid-field">
    <label>Категорія</label>
    <div className="category-grid">
      <button type="button" className={value===""?"selected":""} onClick={()=>onChange("")}><span className="category-grid-icon" style={{background:"var(--line)",color:"var(--muted)"}}><CircleDollarSign size={14}/></span><small>Без категорії</small></button>
      {filtered.map(c=><button type="button" key={c.id} className={value===c.id?"selected":""} onClick={()=>onChange(c.id)}><span className="category-grid-icon" style={{background:`${c.color}22`,color:c.color}}><BudgetIcon name={c.icon} size={14}/></span><small>{c.name}</small></button>)}
    </div>
    <input type="hidden" name="category" value={value}/>
  </div>;
}
function DateWheelField({name}:{name:string}){const [renderedAt]=useState(()=>Date.now()),options=Array.from({length:38},(_,index)=>{const date=new Date(renderedAt);date.setDate(date.getDate()+index-7);const value=toDateKey(date);return {value,label:new Intl.DateTimeFormat("uk-UA",{weekday:"short",day:"numeric",month:"long"}).format(date)}});return <WheelField name={name} label="Дата" options={options} defaultValue={options[7]?.value}/>}
function AccountModal({account,submit,close,openTransactions}:{account:Account|null;submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void;openTransactions:(name:string)=>void}) { const banks=["monobank","ПриватБанк","ПУМБ","Ощадбанк","Райффайзен Банк","А-Банк","Сенс Банк","Укрсиббанк","ОТП Банк","Кредобанк","Пайонер","Готівка","Інший"],selected=banks.includes(account?.bank||"")?account?.bank:"Інший";return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label={account?"Редагування активу":"Новий актив"} title={account?"Змінити рахунок":"Додати рахунок"} close={close}/><label>Назва<input name="name" defaultValue={account?.name} placeholder="Наприклад, Зарплатна картка" required/></label><div className="form-two"><label>Банк<select name="bank" defaultValue={selected}>{banks.map(bank=><option key={bank}>{bank}</option>)}</select></label><label>Власник<input name="owner" defaultValue={account?.owner} placeholder="Мій"/></label></div><div className="form-two"><label>Валюта<select name="currency" defaultValue={account?.currency||"UAH"}><option>UAH</option><option>USD</option><option>EUR</option><option>GBP</option><option>PLN</option></select></label><label>Баланс<input name="balance" type="number" step=".01" defaultValue={account?.balance} placeholder="0"/></label></div><label>Колір картки<input name="cardColor" type="color" defaultValue={account?.color||"#252629"}/></label>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <label>Власний скін картки (фото)<input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const supabase=(await import("@/lib/supabase/client")).createClient();const path=`${Date.now()}-${file.name}`;const {error}=await supabase.storage.from("card-skins").upload(path,file);if(error)return alert(error.message);const {data}=supabase.storage.from("card-skins").getPublicUrl(path);const input=document.querySelector('input[name="cardImageUrl"]') as HTMLInputElement;if(input)input.value=data.publicUrl;}}/></label>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <input type="hidden" name="cardImageUrl" defaultValue={account?.cardImage}/><details className="split-details" open={Boolean(account?.creditLimit||account?.graceEnd)}><summary>Кредитна картка</summary><div className="form-two"><label>Кредитний ліміт<input name="creditLimit" type="number" min="0" defaultValue={account?.creditLimit} placeholder="0"/></label><label>Кінець грейс-періоду<input name="graceEnd" type="date" defaultValue={account?.graceEnd?.slice(0,10)}/></label></div></details><div className="form-two"><button className="primary">{account?"Зберегти зміни":"Створити рахунок"}</button>{account&&<button type="button" className="secondary" onClick={()=>openTransactions(account.name)}>Переглянути операції</button>}</div></form></div>; }
function GoalModal({goal,accounts,submit,close}:{goal:GoalItem|null;accounts:Account[];submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [assetType,setAssetType]=useState(goal?.assetType||"savings");
  const [autoTopup,setAutoTopup]=useState(Boolean(goal?.sourceAccountId));
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal tall-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Накопичення" title={goal?"Редагувати банку":"Нова банка"} close={close}/>
    <label>Назва<input name="name" required defaultValue={goal?.name} placeholder="Резервний фонд"/></label>
    <div className="form-two"><label>Цільова сума<input name="target" type="number" min="1" required defaultValue={goal?.target}/></label><label>Вже накопичено<input name="current" type="number" min="0" defaultValue={goal?.current??0} disabled={Boolean(goal)}/></label></div>
    <div className="form-two"><label>Валюта<select name="currency" defaultValue={goal?.currency||"UAH"}><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Дата (необов'язково)<input name="date" type="date" defaultValue={goal?.date?.slice(0,10)}/></label></div>
    <label>Тип активу<select name="assetType" value={assetType} onChange={e=>setAssetType(e.target.value)}><option value="savings">Накопичення (готівка/банка)</option><option value="deposit">Депозит</option><option value="bond">Облігація</option><option value="security">Цінний папір</option></select></label>
    {assetType!=="savings" && <div className="form-two"><label>Відсоток прибутку на рік, %<input name="annualRate" type="number" min="0" step=".01" defaultValue={goal?.annualRate}/></label><label className="check impulse" style={{alignSelf:"end"}}><input name="compoundInterest" type="checkbox" defaultChecked={goal?.compoundInterest}/> Капіталізація відсотків</label></div>}
    <label>Колір<input name="color" type="color" defaultValue={goal?.color||"#6558e8"}/></label>
    <label className="check impulse"><input type="checkbox" checked={autoTopup} onChange={e=>setAutoTopup(e.target.checked)}/> Підключити автопоповнення</label>
    {autoTopup && <>
      <label>З якого рахунку<select name="sourceAccountId" defaultValue={goal?.sourceAccountId} required={autoTopup}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
      <div className="form-two">
        <label>Округлення залишку до<input name="roundBalanceTo" type="number" min="0" step=".01" placeholder="Наприклад, 100" defaultValue={goal?.roundBalanceTo}/></label>
        <label>Округляти витрати до<input name="roundExpenseTo" type="number" min="0" step=".01" placeholder="Наприклад, 10" defaultValue={goal?.roundExpenseTo}/></label>
      </div>
      <label>Відсоток від кожної витрати, %<input name="expensePercent" type="number" min="0" max="100" step=".1" placeholder="Наприклад, 1" defaultValue={goal?.expensePercent}/></label>
      <small className="field-help">Округлення залишку рахується раз на добу. Округлення витрат і відсоток від витрат — одразу при кожній новій витраті з обраного рахунку.</small>
    </>}
    <button className="primary">{goal?"Зберегти зміни":"Створити банку"}</button>
  </form></div>;
}
function GoalActionModal({action,accounts,withdraw,breakGoal,close}:{action:{goal:GoalItem;mode:"withdraw"|"break"|"history"};accounts:Account[];withdraw:(id:string,amount:number,targetAccountId:string)=>void;breakGoal:(id:string,targetAccountId:string)=>void;close:()=>void}){
  const {goal,mode}=action;
  const [amount,setAmount]=useState("");
  const [accountId,setAccountId]=useState(String(accounts[0]?.id||""));
  const [history,setHistory]=useState<{id:string;amount:number;kind:string;note:string;created_at:string}[]>([]);
  const [loadingHistory,setLoadingHistory]=useState(mode==="history");
  useEffect(()=>{
    if(mode!=="history")return;
    fetch(`/api/finance/goal-history?goalId=${goal.id}`).then(r=>r.ok?r.json():null).then(data=>setHistory(data?.transactions||[])).finally(()=>setLoadingHistory(false));
  },[mode,goal.id]);
  const symbol=currencySymbol(goal.currency);
  if(mode==="history") return <div className="modal-backdrop" onMouseDown={close}><div className="expense-modal tall-modal" onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label={goal.name} title="Історія операцій" close={close}/>
    {loadingHistory?<p className="empty-inline">Завантаження…</p>:history.length?<div className="goal-history-list">{history.map(h=><div key={h.id} className="goal-history-row"><span>{h.kind==="withdrawal"?<ArrowUpRight size={14}/>:h.kind==="interest"?<Sparkles size={14}/>:<ArrowDownLeft size={14}/>}</span><div><strong>{h.note||h.kind}</strong><small>{new Date(h.created_at).toLocaleString("uk-UA")}</small></div><b className={h.amount<0?"":"income-amount"}>{h.amount<0?"−":"+"} {symbol} {formatMoney(h.amount)}</b></div>)}</div>:<EmptyState icon={<BarChart3/>} text="Операцій по цій цілі ще немає"/>}
  </div></div>;
  if(mode==="break") return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={e=>{e.preventDefault();breakGoal(goal.id,accountId)}} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label={goal.name} title="Розбити банку" close={close}/>
    <p style={{color:"var(--muted)",fontSize:13}}>Уся сума {symbol} {formatMoney(goal.current)} перейде на обраний рахунок. Ціль буде видалено назавжди.</p>
    <label>Куди зарахувати<select value={accountId} onChange={e=>setAccountId(e.target.value)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <button className="primary" style={{background:"#d94b4b"}}>Розбити та закрити ціль</button>
  </form></div>;
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={e=>{e.preventDefault();if(Number(amount)>0)withdraw(goal.id,Number(amount),accountId)}} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label={goal.name} title="Зняти кошти" close={close}/>
    <label className="amount-field"><span>{symbol}</span><input autoFocus required inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <small className="field-help">Доступно: {symbol} {formatMoney(goal.current)}</small>
    <label>Куди зарахувати<select value={accountId} onChange={e=>setAccountId(e.target.value)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <button className="primary">Зняти кошти</button>
  </form></div>;
}
function DebtModal({accounts,categories,submit,close}:{accounts:Account[];categories:CategoryItem[];submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [isInstallment,setIsInstallment]=useState(false);
  const [autoDebit,setAutoDebit]=useState(false);
  const [totalAmount,setTotalAmount]=useState("");
  const [months,setMonths]=useState("");
  const perMonth=isInstallment&&Number(totalAmount)>0&&Number(months)>0?Number(totalAmount)/Number(months):0;
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Облік зобов’язань" title="Новий борг" close={close}/>
    <label>Людина або організація<input name="person" required placeholder="Олексій"/></label>
    <div className="form-two"><label>Напрям<select name="direction"><option value="owed_to_me">Мені винні</option><option value="i_owe">Я винна</option></select></label><label>Загальна сума<input name="amount" type="number" min="1" required value={totalAmount} onChange={e=>setTotalAmount(e.target.value)}/></label></div>
    <div className="form-two"><label>Валюта<select name="currency"><option>UAH</option><option>USD</option><option>EUR</option></select></label><label>Повернути до<input name="date" type="date"/></label></div>
    <label>Нотатка<input name="note" placeholder="За квитки"/></label>
    <label className="check impulse"><input type="checkbox" checked={isInstallment} onChange={e=>{setIsInstallment(e.target.checked);if(!e.target.checked)setAutoDebit(false)}}/> Розстрочка (безвідсоткова, оплата частинами)</label>
    <input type="hidden" name="isInstallment" value={isInstallment?"on":""}/>
    {isInstallment && <>
      <label>Кількість місяців<input name="installmentMonths" type="number" min="1" max="60" placeholder="Наприклад, 6" value={months} onChange={e=>setMonths(e.target.value)}/></label>
      {perMonth>0 && <div className="form-message success">Щомісяця приблизно: {formatMoney(perMonth)} грн</div>}
      <label className="check impulse"><input type="checkbox" checked={autoDebit} onChange={e=>setAutoDebit(e.target.checked)}/> Додати автосписання щомісяця</label>
      <input type="hidden" name="autoDebit" value={autoDebit?"on":""}/>
      {autoDebit && <div className="form-two">
        <label>Списувати з рахунку<select name="autoAccount" required={autoDebit}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
        <label>Категорія<select name="autoCategory"><option value="">Без категорії</option>{categories.filter(c=>c.kind==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>}
      {autoDebit && <label>Дата першого списання<input name="autoFirstDate" type="datetime-local" required={autoDebit}/></label>}
    </>}
    <button className="primary">Додати борг</button>
  </form></div>;
}
function SplitBillModal({submit,close}:{submit:(participants:{person:string;amount:number}[],totalNote:string)=>void;close:()=>void}){
  const [total,setTotal]=useState("");
  const [note,setNote]=useState("");
  const [people,setPeople]=useState<string[]>(["",""]);
  const perPerson=people.filter(p=>p.trim()).length&&Number(total)>0?Number(total)/people.filter(p=>p.trim()).length:0;
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={e=>{e.preventDefault();const valid=people.map(p=>p.trim()).filter(Boolean);if(!valid.length||!Number(total))return;submit(valid.map(person=>({person,amount:Math.round(perPerson*100)/100})),note)}} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Спільні витрати" title="Розділити чек" close={close}/>
    <label>Загальна сума<input type="number" min="1" required value={total} onChange={e=>setTotal(e.target.value)}/></label>
    <label>За що<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Вечеря в ресторані"/></label>
    <label>Учасники (крім тебе)</label>
    {people.map((p,i)=><div key={i} className="form-two"><input value={p} onChange={e=>setPeople(v=>v.map((x,idx)=>idx===i?e.target.value:x))} placeholder={`Ім'я ${i+1}`}/>{people.length>2&&<button type="button" className="icon-button danger" onClick={()=>setPeople(v=>v.filter((_,idx)=>idx!==i))}><Trash2 size={14}/></button>}</div>)}
    <button type="button" className="secondary" onClick={()=>setPeople(v=>[...v,""])}>+ Додати учасника</button>
    {perPerson>0 && <div className="form-message success">Кожен винен: {formatMoney(perPerson)} грн</div>}
    <button className="primary">Створити борги</button>
  </form></div>;
}
function SettleDebtModal({debt,accounts,submit,close}:{debt:DebtItem;accounts:Account[];submit:(accountId:string)=>void;close:()=>void}){
  const [accountId,setAccountId]=useState(String(accounts[0]?.id||""));
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={e=>{e.preventDefault();submit(accountId)}} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label={debt.person} title="Зарахувати повернення коштів?" close={close}/>
    <p style={{color:"var(--muted)",fontSize:13}}>{debt.currency} {formatMoney(debt.amount)} буде зараховано на обраний рахунок і борг закрито.</p>
    <label>Рахунок<select value={accountId} onChange={e=>setAccountId(e.target.value)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <button className="primary">Зарахувати та закрити</button>
  </form></div>;
}
function PayInstallmentModal({debt,accounts,submit,close}:{debt:DebtItem;accounts:Account[];submit:(accountId:string,amount:number)=>void;close:()=>void}){
  const suggested=debt.installmentMonths?Math.round((debt.amount/debt.installmentMonths)*100)/100:debt.amount;
  const [amount,setAmount]=useState(String(suggested));
  const [accountId,setAccountId]=useState(String(accounts[0]?.id||""));
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={e=>{e.preventDefault();if(Number(amount)>0)submit(accountId,Number(amount))}} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label={debt.person} title="Погасити розстрочку" close={close}/>
    <label className="amount-field"><span>{currencySymbol(debt.currency)}</span><input autoFocus required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <small className="field-help">Залишок боргу: {currencySymbol(debt.currency)} {formatMoney(debt.amount)}</small>
    <label>Списати з рахунку<select value={accountId} onChange={e=>setAccountId(e.target.value)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <button className="primary">Погасити</button>
  </form></div>;
}
function RecurringModal({accounts,categories,rates,customRates,submit,close}:{accounts:Account[];categories:CategoryItem[];rates:{currency:string;rate:number}[];customRates:{currency:string;rate:number}[];submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [kind,setKind]=useState<"expense"|"income">("expense");
  const [accountId,setAccountId]=useState(String(accounts[0]?.id||""));
  const [sourceCurrency,setSourceCurrency]=useState("USD");
  const [sourceAmount,setSourceAmount]=useState("");
  const [finalAmount,setFinalAmount]=useState("");
  const account=accounts.find(a=>String(a.id)===accountId)||accounts[0];
  const converted=sourceCurrency===account?.currency?Number(sourceAmount)||0:crossRate(sourceCurrency,account?.currency||"UAH",rates,customRates)*(Number(sourceAmount)||0);
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Автоматизація" title={kind==="income"?"Плановий дохід":"Регулярний платіж"} close={close}/>
    <div className="operation-type"><button type="button" className={kind==="expense"?"active":""} onClick={()=>setKind("expense")}><ArrowUpRight/> Витрата</button><button type="button" className={kind==="income"?"active":""} onClick={()=>setKind("income")}><ArrowDownLeft/> Дохід</button></div>
    <input type="hidden" name="kind" value={kind}/>
    <label>Назва<input name="name" required placeholder={kind==="income"?"Зарплата":"Netflix"}/></label>
    <div className="form-two"><label>Рахунок<select name="account" value={accountId} onChange={e=>setAccountId(e.target.value)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label><label>Категорія<select name="category"><option value="">Без категорії</option>{categories.filter(c=>c.kind===kind).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
    <div className="form-two"><label>Сума в<select value={sourceCurrency} onChange={e=>setSourceCurrency(e.target.value)}><option>UAH</option><option>USD</option><option>EUR</option><option>GBP</option><option>PLN</option></select></label><label>Значення<input type="number" min="0" step=".01" value={sourceAmount} onChange={e=>setSourceAmount(e.target.value)}/></label></div>
    {sourceCurrency!==account?.currency && sourceAmount && <div className="form-message success">≈ {formatMoney(converted)} {account?.currency} за поточним курсом</div>}
    <label>Сума до збереження, {account?.currency}<input name="amount" type="number" min=".01" step=".01" required value={finalAmount||(converted?converted.toFixed(2):"")} onChange={e=>setFinalAmount(e.target.value)}/></label>
    <label>Період<select name="frequency"><option value="monthly">Щомісяця</option><option value="weekly">Щотижня</option><option value="yearly">Щороку</option></select></label>
    <label>Наступна дата<input name="date" type="datetime-local" required/></label>
    <label className="check impulse"><input name="auto" type="checkbox"/> Створювати операцію автоматично</label>
    <button className="primary">{kind==="income"?"Зберегти плановий дохід":"Зберегти платіж"}</button>
  </form></div>;
}
function TransferModal({accounts,rates,customRates,presetToAccountId,submit,close}:{accounts:Account[];rates:{currency:string;rate:number}[];customRates:{currency:string;rate:number}[];presetToAccountId?:string;submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [fromId,setFromId]=useState(String(accounts.find(a=>String(a.id)!==presetToAccountId)?.id||accounts[0]?.id||""));
  const [toId,setToId]=useState(String(presetToAccountId||accounts[1]?.id||accounts[0]?.id||""));
  const [sent,setSent]=useState("");
  const [fee,setFee]=useState("0");
  const from=accounts.find(a=>String(a.id)===fromId),to=accounts.find(a=>String(a.id)===toId);
  const showCreditToggle=(to?.creditLimit||0)>0;
  const sameCurrency=!from||!to||from.currency===to.currency;
  const rate=sameCurrency?1:crossRate(from!.currency,to!.currency,rates,customRates);
  const sentValue=Number(sent.replace(",","."))||0;
  const feeValue=Number(fee.replace(",","."))||0;
  const received=sameCurrency?Math.max(0,sentValue-feeValue):Math.max(0,(sentValue-feeValue)*rate);
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Між власними рахунками" title={presetToAccountId?"Погашення кредиту":"Переказ або обмін"} close={close}/>
    <div className="form-two">
      <label>З рахунку<select name="from" value={fromId} onChange={e=>setFromId(e.target.value)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
      <label>На рахунок<select value={toId} onChange={e=>setToId(e.target.value)} disabled={Boolean(presetToAccountId)} required>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
      <input type="hidden" name="to" value={toId}/>
    </div>
    <label className="amount-field"><span>{currencySymbol(from?.currency||"UAH")}</span><input autoFocus required inputMode="decimal" placeholder="0" value={sent} onChange={e=>setSent(e.target.value)}/></label>
    <input type="hidden" name="sent" value={sent}/>
    {!sameCurrency && <div className="form-two">
      <label>Курс обміну ({from?.currency}→{to?.currency})<input name="rate" type="number" min=".000001" step=".000001" value={rate} readOnly/></label>
      <label>Комісія, {from?.currency}<input name="fee" type="number" min="0" step=".01" value={fee} onChange={e=>setFee(e.target.value)}/></label>
    </div>}
    {sameCurrency && <><input type="hidden" name="rate" value="1"/><label>Комісія, {from?.currency}<input name="fee" type="number" min="0" step=".01" value={fee} onChange={e=>setFee(e.target.value)}/></label></>}
    <input type="hidden" name="feeCurrency" value={from?.currency||"UAH"}/>
    <input type="hidden" name="received" value={received.toFixed(2)}/>
    <div className="form-message success">Надійде: {currencySymbol(to?.currency||"UAH")} {formatMoney(received)}{!sameCurrency?` · курс НБУ ${rate.toFixed(4)}`:""}</div>
    <label>Нотатка<input name="note" placeholder={presetToAccountId?"Погашення кредитного ліміту":"Обмін на відпустку"}/></label>
    {showCreditToggle && <label className="check impulse"><input name="reduceCreditLimit" type="checkbox" defaultChecked/> Врахувати як погашення кредитного ліміту</label>}
    <button className="primary">{presetToAccountId?"Погасити кредит":"Виконати переказ"}</button>
  </form></div>;
}
function crossRate(from:string,to:string,rates:{currency:string;rate:number}[],customRates:{currency:string;rate:number}[]){
  const toUah=(currency:string)=>currency==="UAH"?1:(customRates.find(r=>r.currency===currency)?.rate||rates.find(r=>r.currency===currency)?.rate||1);
  return toUah(from)/toUah(to);
}
function BudgetModal({categories,period,initialDate,baseCurrency,submit,close}:{categories:CategoryItem[];period:"month"|"week";initialDate?:string;baseCurrency:string;submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const now=new Date(),weekStart=new Date(now);weekStart.setDate(weekStart.getDate()-((now.getDay()+6)%7));
  const value=initialDate||(period==="week"?weekStart.toISOString().slice(0,10):`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
  const [icon,setIcon]=useState(BUDGET_ICON_NAMES[0]);
  const [color,setColor]=useState(BUDGET_COLORS[0]);
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Планування" title="Ліміт категорії" close={close}/>
    <label>Категорія<select name="category" required>{categories.filter(c=>c.kind==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="form-two"><label>{period==="week"?"Перший день тижня":"Місяць"}<input name="period" type={period==="week"?"date":"month"} defaultValue={value} required/></label><label>Ліміт, {baseCurrency}<input name="limit" type="number" min="1" required/></label></div>
    <input type="hidden" name="icon" value={icon}/>
    <input type="hidden" name="color" value={color}/>
    <label>Іконка ліміту</label>
    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
      {BUDGET_ICON_NAMES.map(name=><button key={name} type="button" onClick={()=>setIcon(name)} style={{width:"34px",height:"34px",borderRadius:"10px",border:icon===name?"2px solid var(--purple)":"1px solid var(--line)",background:icon===name?"color-mix(in srgb,var(--purple) 10%,var(--panel))":"var(--panel)",display:"grid",placeItems:"center",color:icon===name?"var(--purple)":"var(--muted)",cursor:"pointer"}}><BudgetIcon name={name} size={15}/></button>)}
    </div>
    <label>Колір ліміту</label>
    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
      {BUDGET_COLORS.map(hex=><button key={hex} type="button" onClick={()=>setColor(hex)} style={{width:"30px",height:"30px",borderRadius:"50%",background:hex,border:color===hex?"2px solid var(--text)":"2px solid transparent",display:"grid",placeItems:"center",cursor:"pointer"}}>{color===hex&&<Check size={14} color="#fff"/>}</button>)}
    </div>
    {period==="week" && <label className="check impulse"><input name="cloneWeeks" type="checkbox"/> Застосувати цю суму на кожен тиждень цього місяця</label>}
    <button className="primary">Зберегти ліміт</button>
  </form></div>;
}
function CategoryModal({submit,close}:{submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) {
  const [icon,setIcon]=useState(BUDGET_ICON_NAMES[0]);
  const [color,setColor]=useState(BUDGET_COLORS[0]);
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Персоналізація" title="Нова категорія" close={close}/>
    <label>Назва<input name="name" required placeholder="Домашні улюбленці"/></label>
    <label>Тип<select name="kind"><option value="expense">Витрата</option><option value="income">Дохід</option></select></label>
    <input type="hidden" name="icon" value={icon}/>
    <input type="hidden" name="color" value={color}/>
    <label>Іконка</label>
    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
      {BUDGET_ICON_NAMES.map(name=><button key={name} type="button" onClick={()=>setIcon(name)} style={{width:"34px",height:"34px",borderRadius:"10px",border:icon===name?"2px solid var(--purple)":"1px solid var(--line)",background:icon===name?"color-mix(in srgb,var(--purple) 10%,var(--panel))":"var(--panel)",display:"grid",placeItems:"center",color:icon===name?"var(--purple)":"var(--muted)",cursor:"pointer"}}><BudgetIcon name={name} size={15}/></button>)}
    </div>
    <label>Колір</label>
    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
      {BUDGET_COLORS.map(hex=><button key={hex} type="button" onClick={()=>setColor(hex)} style={{width:"30px",height:"30px",borderRadius:"50%",background:hex,border:color===hex?"2px solid var(--text)":"2px solid transparent",display:"grid",placeItems:"center",cursor:"pointer"}}>{color===hex&&<Check size={14} color="#fff"/>}</button>)}
    </div>
    <button className="primary">Створити категорію</button>
  </form></div>;
}
function RuleModal({categories,goals,submit,close}:{categories:CategoryItem[];goals:GoalItem[];submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}){
  const [conditionType,setConditionType]=useState("amount_gt");
  const [actionType,setActionType]=useState("set_category");
  return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <ModalHead label="Автоматизація" title="Нове правило" close={close}/>
    <label>Назва<input name="name" required placeholder="Велика покупка"/></label>
    <label>Умова<select name="conditionType" value={conditionType} onChange={e=>setConditionType(e.target.value)}>
      <option value="amount_gt">Сума більше</option>
      <option value="amount_lt">Сума менше</option>
      <option value="no_category">Без категорії</option>
      <option value="currency_is">Валюта дорівнює</option>
    </select></label>
    {(conditionType==="amount_gt"||conditionType==="amount_lt") && <label>Значення суми<input name="conditionValue" type="number" min="0" required/></label>}
    {conditionType==="currency_is" && <label>Валюта<select name="conditionValue"><option>UAH</option><option>USD</option><option>EUR</option></select></label>}
    <label>Дія<select name="actionType" value={actionType} onChange={e=>setActionType(e.target.value)}>
      <option value="set_category">Встановити категорію</option>
      <option value="contribute_goal_percent">% доходу автоматично в банку</option>
    </select></label>
    {actionType==="set_category" && <label>Категорія<select name="actionCategoryId" required>{categories.filter(c=>c.kind==="expense").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    {actionType==="contribute_goal_percent" && <><label>Банка<select name="actionGoalId" required>{goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Відсоток, %<input name="actionValue" type="number" min="0" max="100" required/></label></>}
    <button className="primary">Створити правило</button>
  </form></div>;
}
function InviteModal({submit,close}:{submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}) { return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><ModalHead label="Спільне планування" title="Запросити учасника" close={close}/><label>Email або username<input name="identifier" required placeholder="partner@example.example.com або @partner"/></label><label>Роль<select name="role"><option value="member">Учасник — може редагувати фінанси</option><option value="viewer">Глядач — лише перегляд</option><option value="admin">Адміністратор — може запрошувати</option></select></label><div className="form-message success">Email-запрошення буде надіслано автоматически. Одноразове посилання также діятиме 7 днів и скопіюється в буфер.</div><button className="primary">Надіслати запрошення</button></form></div>; }
function CustomRateModal({submit,close}:{submit:(e:React.SyntheticEvent<HTMLFormElement>)=>void;close:()=>void}){return <div className="modal-backdrop" onMouseDown={close}><form className="expense-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><ModalHead label="Готівковий або власний курс" title="Додати курс валюти" close={close}/><div className="form-two"><label>Валюта<select name="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>PLN</option></select></label><label>Курс до UAH<input name="rate" type="number" min=".000001" step=".000001" required/></label></div><label>Дата<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required/></label><button className="primary">Зберегти власний курс</button></form></div>}
function ModalHead({label,title,close}:{label:string;title:string;close:()=>void}) { return <div className="modal-head"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><button type="button" onClick={close}><X/></button></div>; }
function exportCsv(items:Transaction[],notify:(s:string)=>void) { const csv=["Назва,Категорія,Дата,Сума,Валюта",...items.map(t=>`"${t.title}","${t.category}","${t.bookedAt||t.date}",${t.amount},${t.currency||"UAH"}`)].join("\n"); const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download="rivna-transactions.csv";a.click();URL.revokeObjectURL(url);notify("CSV-файл завантажено"); }
function exportJson(items:Transaction[],notify:(s:string)=>void){const json=JSON.stringify(items.map(t=>({title:t.title,category:t.category,date:t.bookedAt||t.date,amount:t.amount,currency:t.currency||"UAH",account:t.account,tags:t.tags})),null,2);const blob=new Blob([json],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="rivna-transactions.json";a.click();URL.revokeObjectURL(url);notify("JSON-файл завантажено");}
async function exportExcel(items:Transaction[],notify:(s:string)=>void){const XLSX=await import("xlsx");const rows=items.map(t=>({Назва:t.title,Категорія:t.category,Дата:t.bookedAt||t.date,Сума:t.amount,Валюта:t.currency||"UAH",Рахунок:t.account||"",Власник:t.owner||"",Теги:(t.tags||[]).map(tag=>`#${tag}`).join(" "),Імпульсивна:t.impulse?"Так":"Ні"}));const sheet=XLSX.utils.json_to_sheet(rows),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,"Операції");XLSX.writeFile(book,"rivna-transactions.xlsx");notify("Excel-файл завантажено")}
function translateEntity(value:string){return ({transactions:"Операція",accounts:"Рахунок",transfers:"Переказ",budgets:"Бюджет"} as Record<string,string>)[value]||value}
function translateAction(value:string){return ({insert:"створено",update:"змінено",delete:"видалено"} as Record<string,string>)[value]||value}
