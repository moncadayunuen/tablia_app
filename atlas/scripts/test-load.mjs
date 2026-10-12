import { build } from 'esbuild';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
await build({stdin:{contents:"import './tests/load-table.test.ts'; import './tests/matrix.test.ts'; import './tests/csv-import.test.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/load-table.test.mjs'});
process.exit(spawnSync(process.execPath,['--test','.sites-runtime/load-table.test.mjs'],{stdio:'inherit'}).status??1);
