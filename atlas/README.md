# Tablia

Aplicación de estudio en español con tabla comparativa de dos niveles. El proyecto está en `atlas/`.

## Desarrollo

Requiere Node.js 22.13 o superior. Desde `atlas/`:

```sh
npm ci
npm run dev
```

Al iniciar, Tablia prepara automáticamente las tablas locales que falten, incluida la configuración de encabezados, sin borrar los datos existentes. También puedes ejecutar `npm run db:local`. Los datos locales se conservan en `.wrangler/state`; los datos publicados se guardan en Cloudflare D1 y son independientes del entorno local. Las migraciones de producción se aplican al publicar.

## Funciones

- Cinco familias iniciales, sin contenido académico inventado; campos listos para completar.
- Altas, edición y eliminación confirmada. No se puede eliminar un registro con dependientes ni crear un tercer nivel.
- Búsqueda sin distinción de acentos, filtro por capítulo y orden personalizado, alfabético o por capítulo. El orden personalizado se edita en el formulario de cada registro.
- Exportación CSV UTF-8 compatible con Excel; PDF mediante el diálogo de impresión del navegador. Los filtros y grupos contraídos afectan la exportación.
- Validación de datos en servidor y mensajes de error que conservan el formulario.
- Herramienta WebMCP opcional para abrir el formulario; nunca guarda sin confirmación en la interfaz.

## Verificación

```sh
npx tsc --noEmit
npm run test:load
node tests/api.mjs
```

La prueba de API requiere el servidor local activo y crea y elimina exclusivamente registros con identificadores `test-*`. No ejecutarla contra producción.

El sitio se publica con acceso privado del propietario. No cambiar a acceso compartido o público sin añadir autorización de escritura y aislamiento de datos según el público deseado.

## Marca

Logotipo e imagen social proporcionados por la usuaria. Paleta: azul noche `#0f1e34`, coral `#ff545e`, blanco y grises azulados. Interfaz en Poppins autoalojada (licencia OFL); tipografía oficial confirmada por la usuaria. El logotipo conserva su archivo original.

## Matriz ampliable

En **Encabezados** puedes subdividir columnas, crear grupos, mover columnas entre grupos y elegir texto o casilla. **Añadir grupos del ejemplo** incorpora formas de gobierno, antecedentes, carácter jurídico y fuentes; los textos anteriores se conservan en General. No hay un límite fijo de profundidad; se validan 300 columnas finales y 500 nodos por tabla.

En un registro relacionado, **Grupo de filas** combina visualmente registros del mismo grupo y familia. Las etapas históricas se admiten como registros relacionados. Los filtros recalculan las celdas combinadas. Las casillas se guardan al pulsarlas; CSV incluye las rutas completas y Sí/No, y la impresión conserva los encabezados agrupados. Para matrices muy anchas es preferible CSV, pues el tamaño del papel limita la legibilidad del PDF.

### Importación semanal CSV

En **Importar CSV**, selecciona un archivo UTF-8 (máximo 1,5 MB y 200 filas), revisa la vista previa y confirma. Exportar CSV proporciona una plantilla con IDs y rutas completas. Deja el ID vacío para registros nuevos; conserva el ID para actualizar. Sin ID, la coincidencia se realiza por nombre, clasificación y familia principal. Las celdas vacías conservan el contenido anterior. Las columnas omitidas permanecen intactas.

Los encabezados con `>` crean niveles, por ejemplo `Fuentes del derecho > Escritas > Códigos [casilla]`. Se reutilizan las columnas existentes; una columna convertida en grupo conserva sus datos en **General**. Las columnas nuevas son de texto salvo el sufijo `[casilla]`. Las casillas aceptan Sí/No, true/false, 1/0 o X/✓ para marcar. Se admiten comas, punto y coma y tabulaciones. Incluye `Sistema analizado`; para antecedentes incluye `Familia principal`. Una familia nueva puede aparecer en otra fila del mismo archivo.

La vista previa no escribe datos. La confirmación valida otra vez el CSV y guarda registros y encabezados en una transacción D1. Si la tabla cambió desde la revisión, se rechaza la confirmación y se solicita otra vista previa. Los archivos inválidos se rechazan completos.

Verificación local: `npm run test:load` y, con el servidor local activo, `node tests/import-api.mjs`. La integración usa registros temporales y restaura los encabezados previos; no debe ejecutarse contra producción.

### Exportación

**Exportar** descarga CSV UTF-8 compatible con Excel y PDF directamente. Ambos respetan los registros visibles, filtros, orden y grupos desplegados. El CSV incluye IDs, relaciones y rutas de encabezado. El PDF incorpora Poppins, páginas A4 horizontales, bloques de cinco columnas más el sistema analizado, encabezados agrupados repetidos y numeración. Para árboles de más de seis niveles muestra rutas completas en los títulos para limitar la altura del encabezado. Las relaciones y grupos de filas se repiten junto al nombre del registro para mantener el contexto al cambiar de página.

### Personalizar

El botón **Personalizar** permite editar el título, colores de encabezados y grupos, tipografía (Poppins, Arial o Georgia), tamaño, espaciado, alineación y bordes. Incluye vista previa y restablecimiento antes de guardar. Las preferencias se guardan con la revisión de los encabezados y se conservan al importar CSV. El PDF aplica estos ajustes; Arial y Georgia se representan con las fuentes PDF equivalentes Helvetica y Times. CSV contiene datos sin estilos. **Encabezados** mantiene las opciones de estructura y niveles.
