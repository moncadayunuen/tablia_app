import {blank,recordSchema,type Entry} from './atlas';
import {leaves,layoutSchema,type Column,type Layout} from './columns';
export const norm=(s:string)=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
export function parseCSV(text:string):string[][] {
 text=text.replace(/^\uFEFF/,'');
 // Determine delimiter from the first logical row, ignoring quoted delimiters.
 let quoted=false;const counts:Record<string,number>={',':0,';':0,'\t':0};
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;}else if(!quoted){if(c==='\r'||c==='\n')break;if(c in counts)counts[c]++;}}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 const rows:string[][]=[];let row:string[]=[],cell='',inside=false,closed=false;
 const pushCell=()=>{row.push(cell);cell='';closed=false;};
 const pushRow=()=>{pushCell();if(row.some(v=>v.trim()))rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){const c=text[i];if(inside){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{inside=false;closed=true;}}else cell+=c;continue;}
 if(c==='"'){if(cell||closed)throw new Error('Comillas inválidas en el CSV.');inside=true;}
 else if(c===delimiter)pushCell();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
 else{if(closed)throw new Error('Hay texto después del cierre de comillas.');cell+=c;}}
 if(inside)throw new Error('El CSV contiene comillas sin cerrar.');if(cell||closed||row.length)pushRow();
 if(rows.length<2)throw new Error('El CSV necesita encabezados y al menos un registro.');
 if(rows.length>201)throw new Error('Importa hasta 200 registros por archivo. Divide este CSV en partes.');
 if(rows[0].length>305)throw new Error('El archivo tiene demasiadas columnas.');
 for(let i=1;i<rows.length;i++)if(rows[i].length!==rows[0].length)throw new Error(`Fila ${i+1}: tiene ${rows[i].length} celdas; se esperaban ${rows[0].length}.`);
 return rows;
}
export type ImportPlan={layout:Layout;records:Entry[];added:number;updated:number;unchanged:number;newColumns:string[];changes:{name:string;action:string;fields:string[]}[]};
export function planImport(csv:string,current:Entry[],layout:Layout,chapter='',mode:'merge'|'add'='merge'):ImportPlan {
 const [headers,...rows]=parseCSV(csv);const next=structuredClone(layout);const newColumns:string[]=[];
 const specials:Record<string,string>={'id':'id','clasificacion':'kind','familia principal':'parent','grupo de filas':'rowGroup'};
 const bindings:{special?:string;column?:Column;label:string}[]=[];const targets=new Set<string>();
 for(const raw of headers){let label=raw.trim();if(!label)throw new Error('Los encabezados no pueden estar vacíos.');
 const special=specials[norm(label)];if(special){if(targets.has(special))throw new Error(`Encabezado repetido: ${label}`);targets.add(special);bindings.push({special,label});continue;}
 const check=/\s*\[casilla\]$/i.test(label);label=label.replace(/\s*\[casilla\]$/i,'');const path=label.split('>').map(p=>p.trim());
 if(path.some(p=>!p||p.length>120))throw new Error(`Ruta de encabezado inválida: ${label}`);
 const pathKey=path.map(norm).join('>');let matches=leaves(next.columns).filter(c=>c.path.map(norm).join('>')===pathKey);
 // A simple header may refer to an existing leaf only when unambiguous.
 if(!matches.length&&path.length===1)matches=leaves(next.columns).filter(c=>norm(c.label)===norm(path[0]));
 if(matches.length>1)throw new Error(`«${label}» es ambiguo. Usa su ruta completa con >.`);
 let column:Column|undefined=matches[0];
 if(!column){let nodes=next.columns;
 for(let depth=0;depth<path.length;depth++){const part=path[depth],last=depth===path.length-1;const existing=nodes.filter(n=>norm(n.label)===norm(part));if(existing.length>1)throw new Error(`Grupo ambiguo: ${part}`);let n=existing[0];
 if(n&&last){if(n.children){const general=n.children.find(c=>norm(c.label)==='general'&&!c.children);if(!general)throw new Error(`«${label}» es un grupo. Indica una subcolumna.`);column=general;}else column=n;break;}
 if(n&&!n.children){if(n.field==='name'||n.field==='chapter')throw new Error('Sistema analizado y Capítulo no se pueden subdividir.');const original={...n,label:'General'};const replacement:Column={id:crypto.randomUUID(),label:n.label,children:[original]};nodes[nodes.indexOf(n)]=replacement;n=replacement;}
 if(!n){n={id:crypto.randomUUID(),label:part,...(last?{input:check?'checkbox' as const:'text' as const}:{children:[]})};if(depth===0)nodes.splice(nodes.length-1,0,n);else nodes.push(n);}
 if(last){column=n;newColumns.push(label);}else nodes=n.children!;
 }}
 if(!column)throw new Error(`No se pudo interpretar ${label}`);
 if(check&&column.input!=='checkbox')throw new Error(`«${label}» ya es una columna de texto. Cambia su tipo en Encabezados antes de importar casillas.`);
 const key=column.field||column.id;if(targets.has(key))throw new Error(`Dos encabezados apuntan a «${label}».`);targets.add(key);bindings.push({column,label});
 }
 const nameIndex=bindings.findIndex(b=>b.column?.field==='name');if(nameIndex<0)throw new Error('Incluye la columna «Sistema analizado» con el nombre de cada registro.');
 const meta=(r:string[],key:string)=>{const i=bindings.findIndex(b=>b.special===key);return i<0?'':r[i].trim();};
 const prepared=rows.map((r,i)=>{let name=r[nameIndex].trim(),parent=meta(r,'parent');const parts=name.split(' > ');if(!parent&&parts.length===2){parent=parts[0];name=parts[1];}const kindRaw=norm(meta(r,'kind'));if(kindRaw&&!['family','related','familia','familia principal','relacionado','registro relacionado'].includes(kindRaw))throw new Error(`Fila ${i+2}: clasificación inválida.`);const kind=kindRaw?(['family','familia','familia principal'].includes(kindRaw)?'family':'related'):(parent?'related':'family');if(!name)throw new Error(`Fila ${i+2}: falta Sistema analizado.`);if(kind==='family'&&parent)throw new Error(`Fila ${i+2}: una familia no puede tener familia superior.`);return {r,i,name,parent,kind:kind as Entry['kind']};});
 const working=structuredClone(current);const changed:Entry[]=[];const changes:ImportPlan['changes']=[];let added=0,updated=0,unchanged=0;const seen=new Set<string>();
 for(const item of [...prepared.filter(p=>p.kind==='family'),...prepared.filter(p=>p.kind==='related')]){const {r,i,name,kind}=item;let parent:string|null=null;
 if(kind==='related'){const candidates=working.filter(e=>e.kind==='family'&&(e.id===item.parent||norm(e.name)===norm(item.parent)));if(candidates.length!==1)throw new Error(`Fila ${i+2}: indica una familia principal existente y no ambigua (o inclúyela en el CSV).`);parent=candidates[0].id;}
 const explicitId=meta(r,'id');let matches=explicitId?working.filter(e=>e.id===explicitId):working.filter(e=>norm(e.name)===norm(name)&&e.kind===kind&&e.parent===parent);
 if(matches.length>1)throw new Error(`Fila ${i+2}: hay nombres duplicados. Exporta la tabla e incluye el ID para actualizar el registro correcto.`);
 if(explicitId&&!matches.length)throw new Error(`Fila ${i+2}: ID desconocido. Deja ID vacío para crear un registro.`);
 const existing=matches[0];if(existing&&(existing.kind!==kind||existing.parent!==parent))throw new Error(`Fila ${i+2}: no cambies la familia o clasificación mediante CSV; edítala en la tabla.`);
 if(existing&&mode==='add')throw new Error(`Fila ${i+2}: «${name}» ya existe. Usa Agregar y actualizar o retíralo del archivo.`);
 const key=existing?.id||JSON.stringify([kind,parent,norm(name)]);if(seen.has(key))throw new Error(`Fila ${i+2}: registro repetido en el CSV: ${name}.`);seen.add(key);
 const record:Entry=existing?structuredClone(existing):{...blank,cells:{},id:crypto.randomUUID(),name,kind,parent,chapter,order:Math.max(0,...working.map(e=>e.order))+1};const touched:string[]=[];seen.add(record.id);
 bindings.forEach((b,j)=>{let value=r[j].trim();if(!value)return; // Empty values never erase saved data.
 if(b.special){if(b.special==='rowGroup'&&record.rowGroup!==value){record.rowGroup=value;touched.push(b.label);}return;}
 const c=b.column!;if(c.field==='name')value=name;
 if(c.input==='checkbox'){const v=norm(value);if(['si','true','1','x','✓','✔'].includes(v))value='true';else if(['no','false','0'].includes(v))value='false';else throw new Error(`Fila ${i+2}, ${b.label}: usa Sí/No, 1/0 o true/false para casillas.`);}
 const before=c.field?record[c.field]:record.cells[c.id]||'';if(before!==value){if(c.field)record[c.field]=value;else record.cells[c.id]=value;touched.push(b.label);}
 });
 if(record.kind==='family'&&/^(ley de las xii tablas|ley hortensia|corpus iuris civilis|monarquía romana|república romana|principado|imperio absoluto|compilación de justiniano)$/i.test(record.name))throw new Error(`Fila ${i+2}: clasifica esta etapa o antecedente como registro relacionado.`);
 const valid=recordSchema.safeParse(record);if(!valid.success)throw new Error(`Fila ${i+2}: ${valid.error.issues[0].message}`);
 if(!existing){added++;working.push(record);changed.push(record);}else if(touched.length){updated++;working[working.findIndex(e=>e.id===record.id)]=record;changed.push(record);}else unchanged++;
 changes.push({name,action:!existing?'Agregar':touched.length?'Actualizar':'Sin cambios',fields:touched});
 }
 const parsed=layoutSchema.safeParse(next);if(!parsed.success)throw new Error(parsed.error.issues[0].message);
 return {layout:next,records:changed,added,updated,unchanged,newColumns,changes};
}
