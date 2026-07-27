import {NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {getFinanceContext} from "@/lib/supabase/context";

export const runtime="nodejs";

export async function POST(request:Request){
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(context.role==="viewer")return NextResponse.json({error:"Роль глядача дозволяє лише перегляд"},{status:403});
  const {supabase,householdId}=context;
  const buffer=await request.arrayBuffer();
  if(buffer.byteLength>5_000_000)return NextResponse.json({error:"Файл завеликий"},{status:413});
  let rows:unknown[][];
  try{
    const workbook=XLSX.read(buffer,{type:"array",cellDates:true}),sheet=workbook.Sheets[workbook.SheetNames[0]];
    rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:""}).slice(1,2001);
  }catch{return NextResponse.json({error:"Не вдалося прочитати Excel-файл"},{status:400})}
  const [{data:account},{data:categories}]=await Promise.all([
    supabase.from("accounts").select("id,currency").eq("household_id",householdId).eq("archived",false).order("created_at").limit(1).single(),
    supabase.from("categories").select("id,name").eq("household_id",householdId),
  ]);
  if(!account)return NextResponse.json({error:"Спочатку створіть рахунок"},{status:422});
  const categoryIds=new Map((categories||[]).map(category=>[category.name.toLocaleLowerCase("uk-UA"),category.id]));
  const records=rows.filter(row=>row.length>=4).map(row=>{
    const amount=Number(String(row[3]).replace(/\s/g,"").replace(",","."));
    const parsedDate=row[2] instanceof Date?row[2]:new Date(String(row[2]));
    return {type:amount>=0?"income":"expense",amount:Math.abs(amount),note:String(row[0]||"Імпорт Excel").slice(0,500),category_id:categoryIds.get(String(row[1]||"").toLocaleLowerCase("uk-UA"))||null,booked_at:Number.isNaN(parsedDate.getTime())?new Date().toISOString():parsedDate.toISOString()};
  }).filter(row=>Number.isFinite(row.amount)&&row.amount>0);
  if(!records.length)return NextResponse.json({error:"Excel не містить коректних операцій"},{status:400});
  const {data:imported,error}=await supabase.rpc("import_finance_transactions",{p_account_id:account.id,p_rows:records});
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({imported:Number(imported)||0});
}
