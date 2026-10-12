import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseCSV,planImport} from '../lib/csv-import';
import {blank} from '../lib/atlas';
import {defaultColumns,leaves,csvRows} from '../lib/columns';
const layout={columns:defaultColumns,vertical:false,revision:0};
const family={...blank,id:'family',name:'Familia A',kind:'family' as const,parent:null,origin:'Original'};
test('CSV delimiters, BOM, escaped quotes and multiline',()=>{assert.deepEqual(parseCSV('\uFEFFNombre;Texto\r\nRoma;"Una; ley\ncon ""citas"""'),[['Nombre','Texto'],['Roma','Una; ley\ncon "citas"']]);assert.throws(()=>parseCSV('A,B\nx'));assert.throws(()=>parseCSV('A\n"x'));});
test('weekly imports create nested headers and preserve values, repeat is idempotent',()=>{
 const csv='Sistema analizado,Origen,Fuentes del derecho > Escritas > Códigos [casilla]\nFamilia A,,Sí';
 const p=planImport(csv,[family],layout);assert.equal(p.updated,1);assert.equal(p.records[0].origin,'Original');const leaf=leaves(p.layout.columns).find(c=>c.label==='Códigos')!;assert.equal(p.records[0].cells[leaf.id],'true');assert.ok(leaves(p.layout.columns).some(c=>c.field==='sources'&&c.label==='General'));
 const repeat=planImport(csv,p.records,p.layout);assert.equal(repeat.unchanged,1);assert.equal(repeat.newColumns.length,0);
 const off=planImport(csv.replace(',,Sí',',,No'),p.records,p.layout);assert.equal(off.records[0].cells[leaf.id],'false');
});
test('families resolve independent of file ordering and duplicate new rows fail',()=>{const p=planImport('Sistema analizado,Familia principal\nHijo,Nueva\nNueva,',[],layout,'Semana 2');assert.equal(p.added,2);assert.equal(p.records[1].parent,p.records[0].id);assert.equal(p.records[1].chapter,'Semana 2');assert.throws(()=>planImport('Sistema analizado\nNueva\nNueva',[],layout),/repetido/);assert.throws(()=>planImport('Sistema analizado,Familia principal\nHijo,Ausente',[],layout));});
test('export can be reimported without changing records',()=>{const rows=csvRows([family],layout.columns,[family]);const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');assert.equal(planImport(csv,[family],layout).unchanged,1);assert.throws(()=>planImport(csv,[family],layout,'','add'),/ya existe/);});
