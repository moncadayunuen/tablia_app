# Tablia

Aplicación de estudio en español con tabla comparativa de dos niveles. El proyecto está en `atlas/`.

## Desarrollo

Requiere Node.js 22.13 o superior. Desde `atlas/`:

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_pale_barracuda.sql
npm run dev
```

Aplica la migración una sola vez en cada base local nueva. Los datos locales se conservan en `.wrangler/state`; los datos publicados se guardan en Cloudflare D1 y son independientes del entorno local.

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
node tests/api.mjs
```

La prueba de API requiere el servidor local activo y crea y elimina exclusivamente registros con identificadores `test-*`. No ejecutarla contra producción.

El sitio se publica con acceso privado del propietario. No cambiar a acceso compartido o público sin añadir autorización de escritura y aislamiento de datos según el público deseado.

## Marca

Logotipo e imagen social proporcionados por la usuaria. Paleta: azul noche `#0f1e34`, coral `#ff545e`, blanco y grises azulados. Interfaz en Poppins autoalojada (licencia OFL); tipografía oficial confirmada por la usuaria. El logotipo conserva su archivo original.
