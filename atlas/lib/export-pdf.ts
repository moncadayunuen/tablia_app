import {defaultAppearance,ink,type Appearance} from './appearance';
import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {leaves,headerRows,valueFor,type Column} from './columns';
import type {Entry} from './atlas';
function select(nodes:Column[],ids:Set<string>):Column[]{return nodes.flatMap(n=>{if(!n.children)return ids.has(n.id)?[n]:[];const children=select(n.children,ids);return children.length?[{...n,children}]:[];});}
export function createPDF(entries:Entry[],columns:Column[],families:Entry[],fonts:{regular:string;bold:string},appearance:Appearance=defaultAppearance){
 const pdfFont=appearance.font==='Poppins'?'Poppins':appearance.font==='Arial'?'helvetica':'times';
 const doc=new jsPDF({orientation:'landscape',format:'a4'});
 for(const [style,data] of Object.entries(fonts)){doc.addFileToVFS(style+'.ttf',data);doc.addFont(style+'.ttf','Poppins',style==='regular'?'normal':'bold');}
 doc.setFont('Poppins');doc.setProperties({title:'Tablia - Tabla comparativa',author:'Tablia'});
 const all=leaves(columns),name=all.find(c=>c.field==='name')!,other=all.filter(c=>c.id!==name.id);
 for(let offset=0;offset<other.length;offset+=5){if(offset)doc.addPage();const tree=select(columns,new Set([name.id,...other.slice(offset,offset+5).map(c=>c.id)]));const cols=leaves(tree);
 const head=headerRows(tree).map(row=>row.map(c=>({content:c.column.label,colSpan:c.colSpan,rowSpan:c.rowSpan})));
 // Very deep trees use full paths to keep the repeated header within the page.
 const printableHead=head.length>6?[cols.map(c=>c.path.join(' > '))]:head;
 autoTable(doc,{head:printableHead,body:entries.map(e=>cols.map(c=>{let value=valueFor(e,c);if(c.field==='name'&&e.kind==='related')value=[families.find(f=>f.id===e.parent)?.name,e.rowGroup,e.name].filter(Boolean).join('\n');return c.input==='checkbox'?(value==='true'?'Sí':value==='false'?'No':''):value;})),margin:{top:28,bottom:16,left:12,right:12},styles:{font:pdfFont,fontSize:appearance.size*.65,halign:appearance.align,cellPadding:appearance.padding*.22,overflow:'linebreak',lineWidth:appearance.borders?0.15:0,lineColor:[210,216,225]},headStyles:{fillColor:appearance.header,textColor:ink(appearance.header),fontStyle:'bold'},alternateRowStyles:{fillColor:[246,248,250]},didParseCell:({cell,section})=>{if(section==='head'&&cell.colSpan>1){cell.styles.fillColor=appearance.accent;cell.styles.textColor=ink(appearance.accent);}},rowPageBreak:'avoid',showHead:'everyPage',didDrawPage:()=>{doc.setFont('Poppins','bold');doc.setFontSize(15);doc.setTextColor(16,33,55);doc.text('Tablia',12,13);doc.setFont('Poppins','normal');doc.setFontSize(9);doc.text(`${appearance.title} · Bloque ${Math.floor(offset/5)+1} de ${Math.ceil(other.length/5)} · ${entries.length} registros`,12,21);}});
 }
 const total=doc.getNumberOfPages();for(let p=1;p<=total;p++){doc.setPage(p);doc.setFont('Poppins','normal');doc.setFontSize(8);doc.setTextColor(90);doc.text(`Página ${p} de ${total}`,285,203,{align:'right'});}return doc;
}
export async function downloadPDF(entries:Entry[],columns:Column[],families:Entry[],appearance:Appearance=defaultAppearance){
 const encode=async(path:string)=>{const r=await fetch(path);if(!r.ok)throw new Error('No se pudo cargar la tipografía del PDF.');const bytes=new Uint8Array(await r.arrayBuffer());let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
 const [regular,bold]=await Promise.all([encode('/fonts/poppins-regular.ttf'),encode('/fonts/poppins-bold.ttf')]);createPDF(entries,columns,families,{regular,bold},appearance).save('tablia.pdf');
}
