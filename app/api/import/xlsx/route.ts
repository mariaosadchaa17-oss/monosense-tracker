import {NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {createClient} from "@/lib/supabase/server";

export const runtime="nodejs";

export async function POST(request:Request){
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const buffer=await request.arrayBuffer();
  if(buffer.byteLength>5_000_000)return NextResponse.json({error:"Файл завеликий"},{status:413});
  let rows:unknown[][];
  try{
    const workbook=XLSX.read(buffer,{type:"array",cellDates:true}),sheet=workbook.Sheets[workbook.SheetNames[0]];
    rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:""}).slice(1,2001);
  }catch{return NextResponse.json({error:"Не вдалося прочитати Excel-файл"},{status:400})}
  const {data:membership}=await supabase.from("household_members").select("household_id").eq("user_id",auth.user.id).limit(1).single();
  if(!membership)return NextResponse.json({error:"Простір не знайдено"},{status:422});
  const {data:account}=await supabase.from("accounts").select("id,currency").eq("household_id",membership.household_id).limit(1).single();
  if(!account)return NextResponse.json({error:"Спочатку створіть рахунок"},{status:422});
  const records=rows.filter(row=>row.length>=4).map(row=>{
    const amount=Number(String(row[3]).replace(/\s/g,"").replace(",","."));
    const parsedDate=row[2] instanceof Date?row[2]:new Date(String(row[2]));
    return {household_id:membership.household_id,account_id:account.id,created_by:auth.user!.id,type:amount>=0?"income":"expense",amount:Math.abs(amount),currency:account.currency,note:String(row[0]||"Імпорт Excel").slice(0,500),booked_at:Number.isNaN(parsedDate.getTime())?new Date().toISOString():parsedDate.toISOString()};
  }).filter(row=>Number.isFinite(row.amount)&&row.amount>0);
  if(!records.length)return NextResponse.json({error:"Excel не містить коректних операцій"},{status:400});
  const {error}=await supabase.from("transactions").insert(records);
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({imported:records.length});
}
