import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

function parseCsvLine(line: string) {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: Request) {
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(context.role==="viewer")return NextResponse.json({error:"Роль глядача дозволяє лише перегляд"},{status:403});
  const {supabase,householdId}=context;
  const text = await request.text();
  if (text.length > 5_000_000) return NextResponse.json({ error: "Файл завеликий" }, { status: 413 });
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "CSV не містить даних" }, { status: 400 });
  const [{data:account},{data:categories}]=await Promise.all([
    supabase.from("accounts").select("id,currency").eq("household_id",householdId).eq("archived",false).order("created_at").limit(1).single(),
    supabase.from("categories").select("id,name").eq("household_id",householdId),
  ]);
  if (!account) return NextResponse.json({ error: "Спочатку створіть рахунок" }, { status: 422 });
  const categoryIds=new Map((categories||[]).map(category=>[category.name.toLocaleLowerCase("uk-UA"),category.id]));
  const rows = lines.slice(1, 2001).map(parseCsvLine).filter(row => row.length >= 4).map(row => ({
    type: Number(row[3]) >= 0 ? "income" : "expense", amount: Math.abs(Number(String(row[3]).replace(",", "."))),
    note:row[0].slice(0,500),category_id:categoryIds.get(String(row[1]||"").toLocaleLowerCase("uk-UA"))||null,
    booked_at: Number.isNaN(Date.parse(row[2])) ? new Date().toISOString() : new Date(row[2]).toISOString(),
  })).filter(row => Number.isFinite(row.amount) && row.amount > 0);
  if(!rows.length)return NextResponse.json({error:"CSV не містить коректних операцій"},{status:400});
  const {data:imported,error}=await supabase.rpc("import_finance_transactions",{p_account_id:account.id,p_rows:rows});
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({imported:Number(imported)||0});
}
