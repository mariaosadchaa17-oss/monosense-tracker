import {createHash,randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {getFinanceContext} from "@/lib/supabase/context";
import {createAdminClient} from "@/lib/supabase/admin";

const allowedCategories=[
  "Продукти","Кафе та ресторани","Комуналка","Транспорт","Авто","Здоров’я",
  "Краса","Одяг","Розваги","Підписки","Подарунки","Дім і затишок",
  "Зв’язок та інтернет","Освіта","Подорожі","Спорт","Кишенькові витрати",
  "Домашні улюбленці","Техніка","Інше",
];
type CategoryChoice={name:string;color?:string;limit?:number};
const categoryIcons:Record<string,string>={
  "Продукти":"ShoppingCart","Кафе та ресторани":"Coffee","Комуналка":"House","Транспорт":"Bus","Авто":"Car",
  "Здоров’я":"HeartPulse","Краса":"Sparkles","Одяг":"Shirt","Розваги":"Gamepad2","Підписки":"Repeat2",
  "Подарунки":"Gift","Дім і затишок":"House","Зв’язок та інтернет":"Wifi","Освіта":"GraduationCap",
  "Подорожі":"Plane","Спорт":"Dumbbell","Кишенькові витрати":"WalletCards","Домашні улюбленці":"PawPrint",
  "Техніка":"Smartphone","Інше":"CircleDollarSign",
};

export async function POST(request:Request){
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),admin=createAdminClient();
  const period=body.period==="week"?"week":"month",account=body.account||{};
  const username=String(body.username||"").trim().toLowerCase().replace(/^@/,"").replace(/[^a-z0-9_.-]/g,"").slice(0,30)||null;
  if(!String(account.name||"").trim())return NextResponse.json({error:"Додайте назву першого рахунку"},{status:400});
  if(username){
    const {data:existing}=await admin.from("profiles").select("id").ilike("username",username).neq("id",context.user.id).maybeSingle();
    if(existing)return NextResponse.json({error:"Цей username уже зайнятий"},{status:409});
  }
  const {error:accountError}=await admin.from("accounts").insert({
    household_id:context.householdId,created_by:context.user.id,name:String(account.name).trim().slice(0,80),
    bank:String(account.bank||"Інший").slice(0,80),owner_label:"Мій",currency:String(account.currency||"UAH").slice(0,3),
    balance:Number(account.balance)||0,card_color:String(account.color||"#6558e8").slice(0,20),
  });
  if(accountError)return NextResponse.json({error:accountError.message},{status:400});
  const chosen:CategoryChoice[]=Array.isArray(body.categories)?body.categories.filter((item:CategoryChoice)=>allowedCategories.includes(String(item.name))).slice(0,20):[];
  const categoryRows=chosen.map(item=>({household_id:context.householdId,name:item.name,icon:categoryIcons[item.name]||"CircleDollarSign",color:item.color||"#6558e8",kind:"expense",created_by:context.user.id}));
  if(categoryRows.length)await admin.from("categories").upsert(categoryRows,{onConflict:"household_id,name,kind"});
  const {data:categories}=await admin.from("categories").select("id,name").eq("household_id",context.householdId).eq("kind","expense");
  const now=new Date(),weekStart=new Date(now);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const periodStart=period==="week"?weekStart.toISOString().slice(0,10):now.toISOString().slice(0,7)+"-01";
  const categoryIds=new Map((categories||[]).map(item=>[item.name,item.id]));
  const budgets=chosen.filter(item=>Number(item.limit)>0&&categoryIds.has(item.name)).map(item=>({household_id:context.householdId,category_id:categoryIds.get(item.name),month:periodStart,period_type:period,limit_amount:Number(item.limit),currency:"UAH",created_by:context.user.id}));
  if(budgets.length)await admin.from("budgets").upsert(budgets,{onConflict:"household_id,category_id,month,period_type"});
  const {error:profileError}=await admin.from("profiles").update({username,onboarding_completed:true,planning_period:period,primary_goal:String(body.goal||"control").slice(0,100),updated_at:new Date().toISOString()}).eq("id",context.user.id);
  if(profileError)return NextResponse.json({error:profileError.message},{status:400});
  let inviteUrl:string|undefined,inviteEmailed=false;
  const partner=String(body.partner||"").trim();
  if(partner){
    let email=partner.includes("@")&&!partner.startsWith("@")?partner.toLowerCase():null;
    const partnerUsername=email?null:partner.replace(/^@/,"").toLowerCase();
    if(partnerUsername){const {data:profile}=await admin.from("profiles").select("id,username").ilike("username",partnerUsername).maybeSingle();if(profile){const {data:user}=await admin.auth.admin.getUserById(profile.id);email=user.user?.email?.toLowerCase()||null}}
    const token=randomBytes(32).toString("base64url"),tokenHash=createHash("sha256").update(token).digest("hex");
    const {error:inviteError}=await admin.from("household_invitations").insert({household_id:context.householdId,email,username:partnerUsername||null,role:"member",token_hash:tokenHash,invited_by:context.user.id});
    if(!inviteError){
      const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;inviteUrl=`${origin}/invite/${token}`;
      if(email){const {error:mailError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:inviteUrl,data:{household_invite_url:inviteUrl}});inviteEmailed=!mailError}
    }
  }
  return NextResponse.json({ok:true,inviteUrl,inviteEmailed});
}
