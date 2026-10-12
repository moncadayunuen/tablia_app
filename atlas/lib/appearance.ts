import {z} from 'zod';
export const appearanceSchema=z.object({title:z.string().trim().min(1).max(120),header:z.string().regex(/^#[0-9a-f]{6}$/i),accent:z.string().regex(/^#[0-9a-f]{6}$/i),font:z.enum(['Poppins','Arial','Georgia']),size:z.number().int().min(11).max(20),padding:z.number().int().min(6).max(24),align:z.enum(['left','center','right']),borders:z.boolean()});
export type Appearance=z.infer<typeof appearanceSchema>;
export const defaultAppearance:Appearance={title:'Tabla comparativa',header:'#102137',accent:'#ff545e',font:'Poppins',size:14,padding:14,align:'left',borders:true};
export function ink(hex:string){const rgb=hex.slice(1).match(/../g)!.map(v=>{const n=parseInt(v,16)/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#102137':'#ffffff';}
