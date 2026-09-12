import { z } from 'zod';
import { fields, type Entry } from './atlas';
export type Field = typeof fields[number][0];
export type Column = { id: string; label: string; field?: Field; children?: Column[] };
export type Layout = { columns: Column[]; vertical: boolean; revision: number };
export type Leaf = Column & { path: string[]; headerIds: string[] };
export const defaultColumns: Column[] = fields.map(([field, label]) => ({ id: field, field, label }));
const nodeSchema: z.ZodType<Column> = z.lazy(() => z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  label: z.string().trim().min(1, 'Todos los encabezados necesitan un nombre.').max(120),
  field: z.enum(['name','type','origin','influences','character','sources','countries','legacy','chapter']).optional(),
  children: z.array(nodeSchema).min(1).max(60).optional(),
}).strict());
export function leaves(columns: Column[], path: string[] = [], headerIds: string[] = []): Leaf[] {
  return columns.flatMap(c => c.children ? leaves(c.children, [...path, c.label], [...headerIds, c.id]) : [{...c, path: [...path, c.label], headerIds: [...headerIds, c.id]}]);
}
export function depth(columns: Column[]): number { return Math.max(1, ...columns.map(c => c.children ? 1 + depth(c.children) : 1)); }
export const layoutSchema = z.object({ columns: z.array(nodeSchema).min(2).max(60), vertical: z.boolean(), revision: z.number().int().nonnegative() }).strict().superRefine((layout, ctx) => {
  const ids = new Set<string>(); const bindings = new Set<string>();
  const visit = (nodes: Column[]) => nodes.forEach(n => {
    if (ids.has(n.id)) ctx.addIssue({code:'custom',message:'Cada encabezado debe tener un identificador único.'});
    ids.add(n.id);
    if(n.field){ if(bindings.has(n.field)||n.children)ctx.addIssue({code:'custom',message:'Una columna de datos no puede repetirse ni ser un grupo.'}); bindings.add(n.field); }
    if(n.children)visit(n.children);
  });
  visit(layout.columns);
  if(depth(layout.columns)>5 || leaves(layout.columns).length>60 || ids.size>120)ctx.addIssue({code:'custom',message:'Usa hasta 5 niveles y 60 columnas finales.'});
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
  return [cols.map(c=>c.path.join(' > ')),...entries.map(e=>cols.map(c=>c.field==='name'&&e.kind==='related'?`${families.find(f=>f.id===e.parent)?.name || ''} > ${e.name}`:valueFor(e,c)))];
}
