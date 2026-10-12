import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadTable} from '../lib/load-table';
import {seed} from '../lib/atlas';
import {defaultColumns} from '../lib/columns';
const mock=(fail:boolean)=> (async(url: string)=>Response.json(url.includes('records')?seed:fail?{error:'Missing layout table'}:{columns:defaultColumns,vertical:false,revision:0},{status:!url.includes('records')&&fail?503:200})) as typeof fetch;
test('header failure does not block records',async()=>{const state=await loadTable(mock(true));assert.equal(state.entries.length,5);assert.equal(state.layout,null);assert.ok(state.layoutError);});
test('retry restores headers and clears warning',async()=>{const state=await loadTable(mock(false));assert.equal(state.layout?.columns.length,9);assert.equal(state.layoutError,'');});
test('record failure is still reported',async()=>{await assert.rejects(()=>loadTable((async()=>Response.json({error:'Database unavailable'},{status:503})) as typeof fetch));});
