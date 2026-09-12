import { getBinding } from '@/db';
import { defaultColumns, layoutSchema } from '@/lib/columns';
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const row=await getBinding().prepare('SELECT payload,revision FROM table_layouts WHERE id=?').bind('main').first<{payload:string,revision:number}>();
    return Response.json(row?{...JSON.parse(row.payload),revision:row.revision}:{columns:defaultColumns,vertical:false,revision:0});
  }catch(e){console.error(e);return Response.json({error:'No se pudieron cargar los encabezados. Intenta de nuevo.'},{status:503});}
}
export async function PUT(request:Request){
  try{
    const raw=await request.text();
    if(raw.length>100000)return Response.json({error:'La configuración es demasiado grande.'},{status:400});
    const parsed=layoutSchema.safeParse(JSON.parse(raw));
    if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message || 'Configuración inválida.'},{status:400});
    const {columns,vertical,revision}=parsed.data;
    const payload=JSON.stringify({columns,vertical});
    const result=revision===0
      ?await getBinding().prepare('INSERT OR IGNORE INTO table_layouts(id,payload,revision) VALUES(?,?,1)').bind('main',payload).run()
      :await getBinding().prepare('UPDATE table_layouts SET payload=?,revision=revision+1 WHERE id=? AND revision=?').bind(payload,'main',revision).run();
    if(!result.meta.changes)return Response.json({error:'Los encabezados cambiaron en otra sesión. Cierra este editor, recarga la tabla y vuelve a intentar.'},{status:409});
    return Response.json({columns,vertical,revision:revision+1});
  }catch(e){console.error(e);return Response.json({error:'No se pudo guardar la configuración. Tus cambios siguen en el editor.'},{status:503});}
}
