// Local-only migration preparation; never connects to a remote database.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const hosting=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
if(!hosting.d1)process.exit(0);
mkdirSync('.sites-runtime',{recursive:true});
const config='.sites-runtime/local-db.json';
writeFileSync(config,JSON.stringify({name:'tablia-local',compatibility_date:'2026-05-15',d1_databases:[{binding:hosting.d1,database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}]}));
function run(args){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute',hosting.d1,'--local','--config',config,'--persist-to','.wrangler/state',...args],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout;}
const result=JSON.parse(run(['--command',"SELECT name FROM sqlite_master WHERE type='table'",'--json']));
const tables=new Set(result.flatMap(r=>r.results.map(row=>row.name)));
const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
for(const entry of journal.entries){
 const file=`drizzle/${entry.tag}.sql`,sql=readFileSync(file,'utf8');
 const names=[...sql.matchAll(/CREATE TABLE `([^`]+)`/g)].map(m=>m[1]);
 // These initial migrations only create tables. Detect earlier manual installs without replaying them.
 if(!names.length||/\b(ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(sql))throw new Error(`Revisa la nueva migración ${file} antes de preparar la base local.`);
 if(names.every(name=>tables.has(name)))continue;
 if(names.some(name=>tables.has(name)))throw new Error(`Migración parcial: ${file}. No se modificaron los datos existentes.`);
 run(['--file',file]);names.forEach(name=>tables.add(name));console.log(`Base local preparada: ${entry.tag}`);
}
console.log('Base de datos local lista.');
