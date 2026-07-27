import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");

test("uses Ukrainian metadata and application language",async()=>{
  const [layout,app,manifest]=await Promise.all([read("app/layout.tsx"),read("app/finora-app.tsx"),read("public/manifest.webmanifest")]);
  assert.match(layout,/lang="uk"/);
  assert.match(layout,/особисті фінанси/);
  assert.doesNotMatch(layout,/lang="ru"|личные финансы/);
  assert.match(app,/Головна/);
  assert.match(app,/Налаштування/);
  assert.match(manifest,/"lang"\s*:\s*"uk"/);
});

test("keeps critical finance workflows wired",async()=>{
  const [app,finance,settings,invite,xlsx]=await Promise.all([
    read("app/finora-app.tsx"),read("app/api/finance/route.ts"),read("app/api/settings/route.ts"),
    read("app/api/household/invite/route.ts"),read("app/api/import/xlsx/route.ts"),
  ]);
  for(const action of ["createTransaction","createTransfer","createBudget","createGoal","createDebt","createRecurring","createCategory"])assert.match(finance,new RegExp(action));
  assert.match(app,/exportExcel/);
  assert.match(app,/Динаміка витрат/);
  assert.match(settings,/telegram_chat_id/);
  assert.match(invite,/randomBytes/);
  assert.match(xlsx,/sheet_to_json/);
});
