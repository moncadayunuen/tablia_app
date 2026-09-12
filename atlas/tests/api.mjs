import assert from 'node:assert/strict';
const url=process.env.ATLAS_TEST_URL||'http://localhost:5173/api/records';
async function request(method,body,id){const r=await fetch(url+(id?'?id='+id:''),{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
const initial=await request('GET');assert.equal(initial.status,200);assert.ok(initial.data.length>=5);const base={...initial.data[0],id:'test-family',name:'Familia de prueba'};
try{
assert.equal((await request('POST',base)).status,200);
assert.equal((await request('POST',{...base,id:'test-invalid',kind:'unsupported'})).status,400);
const child={...base,id:'test-related',name:'Antecedente de prueba',kind:'related',parent:base.id};
assert.equal((await request('POST',child)).status,200);
assert.equal((await request('POST',{...child,id:'test-invalid',parent:child.id})).status,400);
assert.equal((await request('DELETE',null,base.id)).status,409);
assert.equal((await request('POST',{...base,kind:'related',parent:'family-1'})).status,400);
assert.equal((await request('POST',{...child,name:'Antecedente editado',chapter:'2'})).status,200);
assert.ok((await request('GET')).data.some(r=>r.id===child.id&&r.name==='Antecedente editado'));
assert.equal((await request('POST',{...base,id:'test-invalid',name:'Ley Hortensia'})).status,400);
assert.equal((await request('DELETE',null,child.id)).status,200);
assert.equal((await request('DELETE',null,base.id)).status,200);
assert.ok(!(await request('GET')).data.some(r=>r.id.startsWith('test-')));
console.log('PASS: creation, editing, persisted read-back, two-level validation, historical classification and protected deletion.');
}finally{for(const id of ['test-invalid','test-related','test-family'])await request('DELETE',null,id);}
