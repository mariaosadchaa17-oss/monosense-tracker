"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,Check,CircleDollarSign,CreditCard,Goal,HeartHandshake,LayoutGrid,Sparkles} from "lucide-react";

const categoryNames=["Продукти","Кафе та ресторани","Комуналка","Транспорт","Авто","Здоров’я","Краса","Одяг","Розваги","Підписки","Подарунки","Дім і затишок","Зв’язок та інтернет","Освіта","Подорожі","Спорт","Кишенькові витрати","Домашні улюбленці","Техніка","Інше"];
// Порядок в categoryNames уже задаёт приоритет (частота использования у большинства людей).
// PRIMARY_CATEGORY_COUNT — сколько карточек показывать до сворачивания, подобрано так,
// чтобы блок помещался на экран без скролла (2 колонки на мобильном, 4 на десктопе).
const PRIMARY_CATEGORY_COUNT=6;
const categoryColors=["#ff7a66","#f0a94a","#6558e8","#4c91e8","#39495e","#28a879","#e874a6","#8875d1","#ef7d53","#4f73d9","#ec6b87","#a57a5a","#42a7a2","#6574c4","#28a879","#ef7658","#d3a032","#9b6b51","#66717d","#878b86"];
const banks=["monobank","ПриватБанк","ПУМБ","Ощадбанк","Райффайзен Банк","А-Банк","Сенс Банк","Укрсиббанк","ОТП Банк","Кредобанк","Пайонер","Готівка","Інший"];
const goals=[["reserve","Накопичити фінансову подушку"],["travel","Відпустка або подорож"],["purchase","Велика покупка"],["debt_free","Вийти з боргів"],["control","Просто контролювати витрати"],["custom","Своя ціль"]];
const suggestedCardColors=['#fecaca', '#a7f3d0', '#bae6fd', '#c7d2fe', '#fbcfe8', '#fef08a', '#bfdbfe', '#e9d5ff', '#fed7aa', '#d9f99d', '#252629'];

const isLight = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

export function OnboardingWizard({displayName}:{displayName:string}){
  const [step,setStep]=useState(1),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [account,setAccount]=useState({name:"Основна картка",bank:"monobank",balance:"",credit_limit:"",currency:"UAH",color:"#252629"});
  const [period,setPeriod]=useState<"month"|"week"|"both">("month"),[goal,setGoal]=useState("control"),[customGoal,setCustomGoal]=useState(""),[partner,setPartner]=useState(""),[username,setUsername]=useState("");
  const [categories,setCategories]=useState(categoryNames.map((name,index)=>({name,color:categoryColors[index],selected:index<PRIMARY_CATEGORY_COUNT,week_limit:"",month_limit:""})));
  const [showAllCategories,setShowAllCategories]=useState(false);
  const selectedBank=banks.indexOf(account.bank);
  const router=useRouter();
  async function finish(){
    setSaving(true);setError("");
    const payload={
      account:{...account,balance:Number(account.balance)||0,credit_limit:Number(account.credit_limit)||0},
      period,
      categories:categories.filter(c=>c.selected).map(c=>({...c,week_limit:Number(c.week_limit)||0,month_limit:Number(c.month_limit)||0})),
      goal:goal==="custom"?customGoal:goal,
      partner,username
    };
    const response=await fetch("/api/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json();setSaving(false);
    if(!response.ok)return setError(result.error||"Не вдалося завершити налаштування");
    if(result.inviteUrl)await navigator.clipboard.writeText(result.inviteUrl).catch(()=>{});
    router.refresh();
  }
return <main className="onboarding-shell"><div className="onboarding-glow"/><section className="onboarding-card"><header className="onboarding-head"><div className="brand"><span className="brand-mark-logo"/></div><div className="step-dots">{[1,2,3,4,5].map(value=><i key={value} className={value<=step?"active":""}/>)}</div><span>{step} / 5</span></header>    <div className="onboarding-body">
{step===1&&<div className="wizard-step"><span className="wizard-icon"><CreditCard/></span><small>Вітаємо, {displayName}</small><h1>Створимо твій перший рахунок</h1><label>Назва<input value={account.name} onChange={event=>setAccount({...account,name:event.target.value})}/></label><div className="wizard-grid"><label>Поточний баланс<input type="number" inputMode="decimal" value={account.balance} onChange={event=>setAccount({...account,balance:event.target.value})} placeholder="0"/></label><label>Кредитний ліміт<input type="number" inputMode="decimal" value={account.credit_limit} onChange={event=>setAccount({...account,credit_limit:event.target.value})} placeholder="0"/></label></div><div className="wizard-grid"><label>Валюта<select value={account.currency} onChange={event=>setAccount({...account,currency:event.target.value})}><option>UAH</option><option>USD</option><option>EUR</option><option>PLN</option></select></label></div><label>Банк</label><div className="wheel-picker" aria-label="Вибір банку">{banks.map((bank,index)=><button type="button" key={bank} className={index===selectedBank?"selected":""} onClick={()=>setAccount({...account,bank})}>{bank}{index===selectedBank&&<Check/>}</button>)}</div>        <label>Колір картки</label>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{display:"flex",gap:"6px", flexWrap: "wrap"}}>
            {suggestedCardColors.map(c=><button key={c} type="button" style={{background:c,width:"32px",height:"32px",borderRadius:"50%",border:account.color.toLowerCase()===c.toLowerCase()?"2px solid #6558e8":"2px solid transparent",display:"grid",placeItems:"center",color:isLight(c)?"#000":"#fff",cursor:"pointer"}} onClick={()=>setAccount({...account,color:c})}>{account.color.toLowerCase()===c.toLowerCase()&&<Check size={16}/>}</button>)}
          </div>
        </div>
      </div>}
      {step===2&&<div className="wizard-step centered"><span className="wizard-icon"><LayoutGrid/></span><small>Період планування</small><h1>Як зручніше планувати?</h1><p>Rivna адаптує прогнози та ліміти під ваш ритм.</p><div className="choice-cards"><button className={period==="month"?"selected":""} onClick={()=>setPeriod("month")}><strong>Місяць</strong><small>Класичний бюджет від зарплати до зарплати</small></button><button className={period==="week"?"selected":""} onClick={()=>setPeriod("week")}><strong>Тиждень</strong><small>Короткі цикли та швидший контроль</small></button><button className={period==="both"?"selected":""} onClick={()=>setPeriod("both")}><strong>Місяць і тиждень</strong><small>Для максимальної гнучкості</small></button></div></div>}
      {step===3&&<div className="wizard-step categories-step"><span className="wizard-icon"><LayoutGrid/></span><small>Категорії та ліміти</small><h1>Оберіть важливе</h1><p>Увімкніть потрібні категорії та за бажанням одразу задайте ліміт.</p><div className="onboarding-categories">{(showAllCategories?categories:categories.slice(0,PRIMARY_CATEGORY_COUNT)).map((item)=>{const index=categories.indexOf(item);return <div key={item.name} className={item.selected?"selected":""}><button type="button" onClick={()=>setCategories(values=>values.map((value,i)=>i===index?{...value,selected:!value.selected}:value))}><i style={{background:item.color}}>{item.selected&&<Check/>}</i><span>{item.name}</span></button>
        <div className="limit-inputs">
          {(period==="week"||period==="both")&&<input type="number" inputMode="numeric" disabled={!item.selected} value={item.week_limit} onChange={event=>{const newWeekValue=event.target.value;const calculatedMonthValue=Number(newWeekValue)*4;setCategories(values=>values.map((value,i)=>i===index?{...value,week_limit:newWeekValue,month_limit:calculatedMonthValue>0?String(calculatedMonthValue):""}:value))}} placeholder="Тиждень, ₴"/>}
          {(period==="month"||period==="both")&&<input type="number" inputMode="numeric" disabled={!item.selected} value={item.month_limit} onChange={event=>setCategories(values=>values.map((value,i)=>i===index?{...value,month_limit:event.target.value}:value))} placeholder="Місяць, ₴"/>}
        </div></div>})}
        {!showAllCategories&&categories.length>PRIMARY_CATEGORY_COUNT&&<button type="button" style={{gridColumn:"1/-1",border:"1px dashed #b9b2f2",background:"#f6f4ff",borderRadius:"13px",padding:"12px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",color:"#6558e8",fontSize:"10px",fontWeight:800,cursor:"pointer"}} onClick={()=>setShowAllCategories(true)}><i style={{width:"26px",height:"26px",borderRadius:"8px",background:"#e4deff",color:"#6558e8",display:"grid",placeItems:"center"}}><LayoutGrid size={13}/></i><span>Ще {categories.length-PRIMARY_CATEGORY_COUNT}</span></button>}
      </div>
      {showAllCategories&&categories.length>PRIMARY_CATEGORY_COUNT&&<button type="button" style={{marginTop:"10px",background:"transparent",border:0,color:"#777d78",fontSize:"10px",fontWeight:700,textDecoration:"underline",cursor:"pointer",width:"auto",padding:"4px"}} onClick={()=>setShowAllCategories(false)}>Згорнути список</button>}
      </div>}
      {step===4&&<div className="wizard-step centered"><span className="wizard-icon"><Goal/></span><small>Головна мета</small><h1>Що для вас найважливіше?</h1><p>Це допоможе Rivna робити підказки доречнішими.</p><div className="goal-options">{goals.map(([value,label])=><button type="button" key={value} className={goal===value?"selected":""} onClick={()=>setGoal(value)}>{label}{goal===value&&<Check/>}</button>)}</div>{goal==="custom"&&<input autoFocus value={customGoal} onChange={event=>setCustomGoal(event.target.value)} placeholder="Опишіть вашу ціль"/>}</div>}
      {step===5&&<div className="wizard-step centered"><span className="wizard-icon"><HeartHandshake/></span><small>Спільний бюджет</small><h1>Планувати разом?</h1><p>Запросіть партнера зараз або пропустіть цей крок.</p><label>Ваш унікальний username<input value={username} onChange={event=>setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g,""))} placeholder="maria"/></label><label>Email або username партнера<input value={partner} onChange={event=>setPartner(event.target.value)} placeholder="partner@example.com або @partner"/></label><div className="invite-note"><Sparkles/> Якщо людина ще не зареєстрована, буде створене invite‑посилання й скопійоване після завершення.</div></div>}
    </div>
    {error&&<div className="form-message error onboarding-error">{error}</div>}
    <footer className="onboarding-actions">{step > 1 && <button className="secondary" disabled={saving} onClick={()=>setStep(value=>value-1)}><ArrowLeft/> Назад</button>}{step<5?<button className="primary" disabled={step===1&&!account.name.trim()} onClick={()=>setStep(value=>value+1)}>Продовжити <ArrowRight/></button>:<button className="primary" disabled={saving} onClick={finish}>{saving?"Зберігаємо…":"Почати"} <Check/></button>}</footer>
  </section></main>
}
