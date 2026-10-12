import assert from 'node:assert/strict';
import {test} from 'node:test';
import {blank,recordSchema} from '../lib/atlas';
import {defaultColumns,layoutSchema,headerRows,leaves,groupRows,groupSpan,csvRows,relocateColumn,type Column} from '../lib/columns';
test('uneven deep headers fill a rectangular grid',()=>{
 let nested:Column={id:'leaf',label:'Final',input:'checkbox'};
 for(let i=0;i<9;i++)nested={id:'group'+i,label:'Nivel '+i,children:[nested]};
 const columns=[defaultColumns[0],nested,{id:'short',label:'Corta'},defaultColumns.at(-1)!];
 assert.ok(layoutSchema.safeParse({columns,vertical:true,revision:0}).success);
 const rows=headerRows(columns);assert.equal(rows.length,10);
 const grid=rows.map(()=>Array(leaves(columns).length).fill(false));
 rows.forEach((row,y)=>{let x=0;row.forEach(cell=>{while(grid[y][x])x++;for(let dy=0;dy<cell.rowSpan;dy++)for(let dx=0;dx<cell.colSpan;dx++){assert.equal(grid[y+dy][x+dx],false);grid[y+dy][x+dx]=true;}x+=cell.colSpan;});});
 assert.ok(grid.every(row=>row.every(Boolean)));
});
test('moving columns preserves ids and rejects cycles',()=>{const nodes=[defaultColumns[0],{id:'a',label:'A',children:[{id:'b',label:'B',children:[{id:'leaf',label:'Value'}]}]},defaultColumns.at(-1)!];assert.throws(()=>relocateColumn(nodes,'a','b'));assert.equal(leaves(relocateColumn(nodes,'leaf','root'))[1].id,'leaf');});
test('row groups span filtered siblings only and never other families',()=>{const rows=['a','b','a'].map((parent,i)=>({...blank,id:String(i),kind:'related' as const,parent,rowGroup:'Roma'}));const grouped=groupRows(rows);assert.deepEqual(grouped.map(r=>r.id),['0','2','1']);assert.deepEqual(grouped.map((_,i)=>groupSpan(grouped,i)),[2,0,1]);assert.equal(groupSpan([grouped[1]],0),1);});
test('legacy records gain defaults; exports include groups, checks and full paths',()=>{const old={...blank,id:'old',name:'Anterior'};delete (old as Partial<typeof blank>).rowGroup;delete (old as Partial<typeof blank>).cells;assert.equal(recordSchema.parse(old).rowGroup,'');});
test('CSV paths and checkbox values',()=>{const record={...blank,name:'Roma',rowGroup:'Evolución',cells:{yes:'true',no:'false'}};const cols=[{id:'g',label:'Fuentes',children:[{id:'yes',label:'Leyes',input:'checkbox' as const},{id:'no',label:'Costumbres',input:'checkbox' as const}]}];assert.deepEqual(csvRows([record],cols,[]),[['ID','Clasificación','Familia principal','Grupo de filas','Fuentes > Leyes','Fuentes > Costumbres'],[record.id,record.kind,'','Evolución','Sí','No']]);});
test('appearance accepts validated preferences and rejects unsafe colors',()=>{const layout={columns:defaultColumns,vertical:false,revision:0,appearance:{title:'Mi tabla',header:'#123456',accent:'#ff4455',font:'Poppins',size:16,padding:12,align:'center',borders:false}};assert.ok(layoutSchema.safeParse(layout).success);assert.equal(layoutSchema.safeParse({...layout,appearance:{...layout.appearance,header:'url(unsafe)'}}).success,false);});
