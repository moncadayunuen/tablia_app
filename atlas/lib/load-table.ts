import { recordSchema } from './atlas';
import { layoutSchema } from './columns';
async function read(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url);
  const data: unknown = await response.json();
  if (!response.ok) throw new Error((data as {error?:string}).error || 'No se pudo cargar la información.');
  return data;
}
export async function loadTable(fetcher: typeof fetch = fetch) {
  const [records, layout] = await Promise.allSettled([
    read('/api/records', fetcher).then(data => recordSchema.array().parse(data)),
    read('/api/layout', fetcher).then(data => layoutSchema.parse(data)),
  ]);
  if (records.status === 'rejected') throw records.reason;
  return {
    entries: records.value,
    layout: layout.status === 'fulfilled' ? layout.value : null,
    layoutError: layout.status === 'rejected' ? 'No se pudieron cargar los encabezados personalizados. Puedes agregar registros con las columnas disponibles. Reintenta antes de modificar encabezados.' : '',
  };
}
