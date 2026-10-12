import {appearanceSchema,type Appearance} from './appearance';
import { z } from 'zod';
import { fields, type Entry } from './atlas';
export type Field = typeof fields[number][0];
export type Column = { id: string; label: string; field?: Field; input?: 'text' | 'checkbox'; children?: Column[] };
export type Layout = { columns: Column[]; vertical: boolean; revision: number; appearance?: Appearance };
export type Leaf = Column & { path: string[]; headerIds: string[] };
export const defaultColumns: Column[] = fields.map(([field, label]) => ({ id: field, field, label }));
const nodeSchema: z.ZodType<Column> = z.lazy(() => z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  label: z.string().trim().min(1, 'Todos los encabezados necesitan un nombre.').max(120),
  field: z.enum(['name','type','origin','influences','character','sources','countries','legacy','chapter']).optional(),
  input: z.enum(['text','checkbox']).optional(),
  children: z.array(nodeSchema).min(1).max(500).optional(),
}).strict());
export function leaves(columns: Column[], path: string[] = [], headerIds: string[] = []): Leaf[] {
  return columns.flatMap(c => c.children ? leaves(c.children, [...path, c.label], [...headerIds, c.id]) : [{...c, path: [...path, c.label], headerIds: [...headerIds, c.id]}]);
}
export function depth(columns: Column[]): number { return Math.max(1, ...columns.map(c => c.children ? 1 + depth(c.children) : 1)); }
export const layoutSchema = z.object({ appearance:appearanceSchema.optional(), columns: z.array(nodeSchema).min(2).max(500), vertical: z.boolean(), revision: z.number().int().nonnegative() }).strict().superRefine((layout, ctx) => {
  const ids = new Set<string>(); const bindings = new Set<string>();
  const visit = (nodes: Column[]) => nodes.forEach(n => {
    if (ids.has(n.id)) ctx.addIssue({code:'custom',message:'Cada encabezado debe tener un identificador único.'});
    ids.add(n.id);
    if(n.input==='checkbox'&&(n.field==='name'||n.field==='chapter'||n.children))ctx.addIssue({code:'custom',message:'Los grupos y las columnas fijas no admiten casillas.'});
    if(n.field){ if(bindings.has(n.field)||n.children)ctx.addIssue({code:'custom',message:'Una columna de datos no puede repetirse ni ser un grupo.'}); bindings.add(n.field); }
    if(n.children)visit(n.children);
  });
  visit(layout.columns);
  if(leaves(layout.columns).length>300 || ids.size>500)ctx.addIssue({code:'custom',message:'La tabla admite hasta 300 columnas finales y 500 encabezados.'});
  const first = layout.columns[0], last = layout.columns.at(-1);
  if(first.field!=='name'||first.children||last?.field!=='chapter'||last.children)ctx.addIssue({code:'custom',message:'Sistema analizado y Capítulo deben permanecer en los extremos como columnas simples.'});
});
export function valueFor(entry: Entry, column: Column): string { return column.field ? entry[column.field] : entry.cells[column.id] || ''; }
export function headerRows(columns: Column[]) {
  const rows: {column: Column; colSpan: number; rowSpan: number; level: number}[][] = Array.from({length:depth(columns)},()=>[]);
  const visit = (nodes: Column[], level: number) => nodes.forEach(column => {
    rows[level].push({column,colSpan:column.children?leaves(column.children).length:1,rowSpan:column.children?1:rows.length-level,level});
    if(column.children)visit(column.children,level+1);
  });
  visit(columns,0); return rows;
}
export function csvRows(entries: Entry[], columns: Column[], families: Entry[]) {
  const cols=leaves(columns);
  return [['ID','Clasificación','Familia principal','Grupo de filas',...cols.map(c=>c.path.join(' > '))],...entries.map(e=>[e.id,e.kind,e.parent?families.find(f=>f.id===e.parent)?.name||'':'',e.rowGroup,...cols.map(c=>c.input==='checkbox'?(valueFor(e,c)==='true'?'Sí':valueFor(e,c)==='false'?'No':valueFor(e,c)):valueFor(e,c))])];
}

// Group siblings without merging identically named groups from different families.
export function groupRows(rows: Entry[]): Entry[] {
  const result:Entry[]=[];const seen=new Set<string>();
  for(const row of rows){if(!row.rowGroup||row.kind==='family'){result.push(row);continue;}
    const key=JSON.stringify([row.parent,row.rowGroup]);if(seen.has(key))continue;seen.add(key);
    result.push(...rows.filter(r=>r.kind==='related'&&r.parent===row.parent&&r.rowGroup===row.rowGroup));
  }return result;
}
export function groupSpan(rows:Entry[],index:number):number {
 const row=rows[index];if(!row.rowGroup||row.kind==='family')return 1;
 const same=(r:Entry)=>r.kind==='related'&&r.parent===row.parent&&r.rowGroup===row.rowGroup;
 if(index>0&&same(rows[index-1]))return 0;
 let end=index+1;while(end<rows.length&&same(rows[end]))end++;return end-index;
}
export function exampleColumns():Column[]{
 const group=(id:string,label:string,names:string[]):Column=>({id,label,children:names.map((label,i)=>({id:`${id}-${i}`,label,input:'checkbox'}))});
 return [group('government','Formas de gobierno',['Monarquía','República','Principado / Diarquía','Imperio absoluto']),group('influence-options','Antecedentes e influencias',['Derecho romano','Tradición germánica','Derecho canónico','Common law inglés','Base religiosa','Tradición socialista','Amalgama de tradiciones']),group('character-options','Carácter jurídico predominante',['Legislativo o codificado','Jurisprudencial','Consuetudinario','Religioso','Mixto','Estatal-socialista']),group('source-options','Fuentes del derecho',['Costumbres (mores maiorum)','Leyes / Compilaciones','Plebiscitos','Edictos de magistrados','Senadoconsultos','Jurisprudencia','Constituciones imperiales','Textos sagrados','Normas eclesiásticas'])];
}
export function relocateColumn(nodes:Column[],id:string,parentId:string):Column[]{
 let target:Column|undefined;
 const find=(ns:Column[])=>{for(const n of ns){if(n.id===id)target=n;if(n.children)find(n.children);}};find(nodes);
 if(!target||target.field==='name'||target.field==='chapter')throw new Error('No se puede mover esta columna.');
 const subtree=new Set<string>();const collect=(n:Column)=>{subtree.add(n.id);n.children?.forEach(collect);};collect(target);
 if(subtree.has(parentId))throw new Error('Un grupo no puede estar dentro de sí mismo.');
 const remove=(ns:Column[]):Column[]=>ns.filter(n=>n.id!==id).map(n=>n.children?{...n,children:remove(n.children)}:n).filter(n=>!n.children||n.children.length);
 const clean=remove(nodes);if(parentId==='root')return [...clean.slice(0,-1),target,clean.at(-1)!];
 let inserted=false;const insert=(ns:Column[]):Column[]=>ns.map(n=>n.id===parentId&&n.children?(inserted=true,{...n,children:[...n.children,target!]}):n.children?{...n,children:insert(n.children)}:n);
 const result=insert(clean);if(!inserted)throw new Error('Selecciona un grupo válido.');return result;
}
export function columnGroups(nodes:Column[],path:string[]=[]):{id:string;label:string}[]{return nodes.flatMap(n=>n.children?[{id:n.id,label:[...path,n.label].join(' / ')},...columnGroups(n.children,[...path,n.label])]:[]);}
export function addExampleColumns(columns:Column[]):Column[]{
 const examples=exampleColumns();const bindings:Record<string,Column>={influences:examples[1],character:examples[2],sources:examples[3]};
 const existing=new Set(columnGroups(columns).map(g=>g.label));
 const result=columns.map(c=>c.field&&bindings[c.field]&&!existing.has(bindings[c.field].label)?{...bindings[c.field],children:[{...c,label:'General'},...bindings[c.field].children!]}:c);
 if(!existing.has(examples[0].label)){const i=result.findIndex(c=>c.field==='type');result.splice(i<0?1:i+1,0,examples[0]);}
 return result;
}
