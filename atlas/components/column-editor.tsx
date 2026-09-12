'use client';
import {useState} from 'react';
import {Plus,ArrowUp,ArrowDown,Trash2,CornerDownRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import {Switch} from '@/components/ui/switch';
import {Table,TableHeader,TableRow,TableHead} from '@/components/ui/table';
import {depth,headerRows,leaves,layoutSchema,type Column,type Layout} from '@/lib/columns';
const fresh=(label='Nueva subcolumna'):Column=>({id:crypto.randomUUID(),label});
function change(nodes:Column[],id:string,fn:(node:Column)=>Column):Column[]{return nodes.map(n=>n.id===id?fn(n):n.children?{...n,children:change(n.children,id,fn)}:n);}
function remove(nodes:Column[],id:string):Column[]{return nodes.filter(n=>n.id!==id).map(n=>n.children?{...n,children:remove(n.children,id)}:n).filter(n=>!n.children||n.children.length);}
function move(nodes:Column[],id:string,direction:number):Column[]{const i=nodes.findIndex(n=>n.id===id);if(i>=0){const next=[...nodes];[next[i],next[i+direction]]=[next[i+direction],next[i]];return next;}return nodes.map(n=>n.children?{...n,children:move(n.children,id,direction)}:n);}
export default function ColumnEditor({layout,onClose,onSave}:{layout:Layout,onClose:()=>void,onSave:(layout:Layout)=>void}){
  const [draft,setDraft]=useState<Layout>(structuredClone(layout));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<Column|null>(null);
  const edit=(id:string,fn:(node:Column)=>Column)=>setDraft(d=>({...d,columns:change(d.columns,id,fn)}));
  async function save(){
    setError('');const parsed=layoutSchema.safeParse(draft);
    if(!parsed.success){setError(parsed.error.issues[0].message);return;}
    setBusy(true);
    try{const r=await fetch('/api/layout',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)});const data=await r.json();if(!r.ok)throw new Error((data as {error:string}).error);onSave(layoutSchema.parse(data));}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function render(nodes:Column[],level=0){return nodes.map((n,i)=>{
    const fixed=n.field==='name'||n.field==='chapter';
    const canUp=i>0&&nodes[i-1].field!=='name'&&!fixed;
    const canDown=i<nodes.length-1&&nodes[i+1].field!=='chapter'&&!fixed;
    return <div className="column-node" key={n.id}>
      <div className="column-line"><span className="column-kind">{n.children?'Grupo':fixed?'Fija':'Columna'}</span><input aria-label={`Nombre del encabezado ${n.label}`} maxLength={120} value={n.label} onChange={e=>edit(n.id,c=>({...c,label:e.target.value}))}/><div className="column-actions">
        <button type="button" title="Subir" aria-label={`Subir ${n.label}`} disabled={!canUp||busy} onClick={()=>setDraft(d=>({...d,columns:move(d.columns,n.id,-1)}))}><ArrowUp size={16}/></button>
        <button type="button" title="Bajar" aria-label={`Bajar ${n.label}`} disabled={!canDown||busy} onClick={()=>setDraft(d=>({...d,columns:move(d.columns,n.id,1)}))}><ArrowDown size={16}/></button>
        {!fixed&&<button type="button" disabled={level>=4||busy||leaves(draft.columns).length>=60} className="subdivide" onClick={()=>edit(n.id,c=>c.children?{...c,children:[...c.children,fresh()]}:{id:crypto.randomUUID(),label:c.label,children:[{...c,label:'General'},fresh()]} )}><CornerDownRight size={16}/>{n.children?'Subcolumna':'Subdividir'}</button>}
        {!fixed&&<button type="button" title="Quitar encabezado" aria-label={`Quitar ${n.label}`} disabled={busy} onClick={()=>setPending(n)}><Trash2 size={16}/></button>}
      </div>{n.children&&<div className="column-children">{render(n.children,level+1)}</div>}
    </div>;
  });}
  return <><Dialog open onOpenChange={v=>{if(!v&&!busy)onClose();}}><DialogContent className="column-editor"><DialogTitle>Configurar encabezados</DialogTitle><DialogDescription>Agrupa columnas o añade subdivisiones. Al subdividir una columna, su información se conserva en «General».</DialogDescription>
    <div className="column-editor-body"><fieldset disabled={busy} className="column-tree">{render(draft.columns)}</fieldset>
    <div className="column-add"><button className="outline" disabled={busy||leaves(draft.columns).length>=60} onClick={()=>setDraft(d=>({...d,columns:[...d.columns.slice(0,-1),fresh('Nueva columna'),d.columns.at(-1)!]}))}><Plus size={16}/>Columna</button><button className="outline" disabled={busy||leaves(draft.columns).length>58} onClick={()=>setDraft(d=>({...d,columns:[...d.columns.slice(0,-1),{id:crypto.randomUUID(),label:'Nuevo grupo',children:[fresh('Subcolumna 1'),fresh('Subcolumna 2')]},d.columns.at(-1)!]}))}><Plus size={16}/>Grupo de columnas</button></div>
    <label className="orientation"><Switch checked={draft.vertical} onCheckedChange={vertical=>setDraft(d=>({...d,vertical}))} disabled={busy}/>Títulos de subcolumnas en vertical</label>
    <div className="header-preview"><div className="preview-label">VISTA PREVIA · {depth(draft.columns)} niveles · {leaves(draft.columns).length} columnas</div><Table className={draft.vertical?'vertical-headers':''}><TableHeader>{headerRows(draft.columns).map((row,i)=><TableRow key={i}>{row.map(({column,colSpan,rowSpan,level})=><TableHead key={column.id} colSpan={colSpan} rowSpan={rowSpan} className={column.children?'group-header':level>0?'sub-header':''}><span>{column.label||'Sin título'}</span></TableHead>)}</TableRow>)}</TableHeader></Table></div>
    </div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-footer"><button className="outline" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy} onClick={save}>{busy?'Guardando…':'Guardar encabezados'}</button></div>
  </DialogContent></Dialog>
  <AlertDialog open={!!pending} onOpenChange={v=>{if(!v)setPending(null);}}><AlertDialogContent><AlertDialogTitle>¿Quitar «{pending?.label}»?</AlertDialogTitle><AlertDialogDescription>Se retirará de la tabla{pending?.children?' junto con todas sus subcolumnas':''} al guardar los encabezados. Los valores guardados no se borran. Puedes cancelar la configuración para deshacer este cambio antes de guardar.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><button className="primary" onClick={()=>{if(pending)setDraft(d=>({...d,columns:remove(d.columns,pending.id)}));setPending(null);}}>Quitar encabezado</button></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
