import assert from 'node:assert/strict';
const base='http://localhost:5173/api';
async function request(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
const layout=(await request('/layout')).data;
const name='CSV test '+crypto.randomUUID();
const csv=`Sistema analizado,Fuentes del derecho > Prueba CSV [casilla]\n${name},Sí`;
try {
 const p=await request('/import','POST',{csv});assert.equal(p.status,200,JSON.stringify(p.data));assert.equal(p.data.added,1);
 assert.ok(!(await request('/records')).data.some(r=>r.name===name));
 const commit=await request('/import','POST',{csv,commit:true,snapshot:p.data.snapshot});assert.equal(commit.status,200,JSON.stringify(commit.data));
 const rows=(await request('/records')).data;assert.ok(rows.some(r=>r.name===name));
 const repeat=await request('/import','POST',{csv});assert.equal(repeat.data.unchanged,1);
 const stale=await request('/import','POST',{csv,commit:true,snapshot:p.data.snapshot});assert.equal(stale.status,409);
 console.log('PASS: preview is read-only; commit persists columns and records; repeated import is idempotent; stale preview rejected.');
} finally {
 for(const r of (await request('/records')).data.filter(r=>r.name===name))await request('/records?id='+r.id,'DELETE');
 const latest=(await request('/layout')).data;
 if(latest.revision!==layout.revision)assert.equal((await request('/layout','PUT',{...layout,revision:latest.revision})).status,200);
}
