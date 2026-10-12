import {createPDF} from '../lib/export-pdf';
import {addExampleColumns,defaultColumns} from '../lib/columns';
import {seed} from '../lib/atlas';
import {readFileSync,writeFileSync} from 'node:fs';
const fonts={regular:readFileSync('public/fonts/poppins-regular.ttf').toString('base64'),bold:readFileSync('public/fonts/poppins-bold.ttf').toString('base64')};
const doc=createPDF(seed,addExampleColumns(defaultColumns),seed,fonts);
if(doc.getNumberOfPages()<2)throw new Error('Expected column blocks');
writeFileSync('/tmp/tablia-export-test.pdf',Buffer.from(doc.output('arraybuffer')));
console.log('PDF generated:',doc.getNumberOfPages(),'pages');
