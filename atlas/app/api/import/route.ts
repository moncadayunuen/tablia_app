import {z} from 'zod';
import {getBinding} from '@/db';
import {recordSchema} from '@/lib/atlas';
import {defaultColumns,layoutSchema} from '@/lib/columns';
import {planImport} from '@/lib/csv-import';
export const dynamic='force-dynamic';
const input=z.object({csv:z.string().max(1500000),chapter:z.string().trim().max(100).default(''),mode:z.enum(['merge','add']).default('merge'),commit:z.boolean().default(false),snapshot:z.string().optional()});
const snapshotSQL="SELECT json_group_array(json_object('id',id,'payload',payload)) AS snapshot FROM (SELECT id,payload FROM records ORDER BY id)";
async function hash(s:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export async function POST(request:Request){
 try{
 const raw=await request.text();if(raw.length>2000000)return Response.json({error:'El archivo es demasiado grande (máximo 1,5 MB).'}, {status:413});
 const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'Archivo u opciones inválidos.'},{status:400});
 const args=parsed.data,db=getBinding();
 const snapshots=await db.batch([db.prepare(snapshotSQL),db.prepare("SELECT payload,revision FROM table_layouts WHERE id='main'")]);
 const state=String((snapshots[0].results[0] as {snapshot:string}).snapshot);const stored=snapshots[1].results[0] as {payload:string,revision:number}|undefined;
 const records=JSON.parse(state).map((r:{payload:string})=>JSON.parse(r.payload)).filter((r:{kind:string})=>['family','related'].includes(r.kind)).map((r:unknown)=>recordSchema.parse(r));
 const layout=layoutSchema.parse(stored?{...JSON.parse(stored.payload),revision:stored.revision}:{columns:defaultColumns,vertical:false,revision:0});
 const snapshot=await hash(JSON.stringify([state,stored||null]));
 if(args.commit&&args.snapshot!==snapshot)return Response.json({error:'La tabla cambió desde la vista previa. Vuelve a revisar el archivo antes de importar.'},{status:409});
 const plan=planImport(args.csv,records,layout,args.chapter,args.mode);
 if(!args.commit)return Response.json({...plan,records:undefined,snapshot});
 const layoutChanged=JSON.stringify(plan.layout.columns)!==JSON.stringify(layout.columns);
 if(plan.records.length||layoutChanged){
 // D1 batch is transactional. A stale snapshot fails the first statement and rolls back all writes.
 const guard=db.prepare(`SELECT CASE WHEN (${snapshotSQL.replace(' AS snapshot','')}) = ? AND COALESCE((SELECT revision FROM table_layouts WHERE id='main'),0)=? THEN 1 ELSE json('IMPORT_CONFLICT') END`).bind(state,layout.revision);
 const statements=[guard,...plan.records.map(r=>db.prepare('INSERT INTO records(id,kind,parent,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,parent=excluded.parent,payload=excluded.payload').bind(r.id,r.kind,r.parent,JSON.stringify(r)))];
 if(layoutChanged)statements.push(db.prepare("INSERT INTO table_layouts(id,payload,revision) VALUES('main',?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision").bind(JSON.stringify({columns:plan.layout.columns,vertical:plan.layout.vertical,appearance:plan.layout.appearance}),layout.revision+1));
 try{await db.batch(statements);}catch(e){console.error(e);return Response.json({error:'No se importó ningún cambio. La tabla pudo cambiar en otra sesión; genera otra vista previa e intenta de nuevo.'},{status:409});}
 }
 return Response.json({added:plan.added,updated:plan.updated,unchanged:plan.unchanged,newColumns:plan.newColumns});
 }catch(e){console.error(e);return Response.json({error:e instanceof Error?e.message:'No se pudo importar el archivo.'},{status:400});}
}
