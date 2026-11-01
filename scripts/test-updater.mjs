import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'carte-claire-updater-'));
try{
 await mkdir(join(dir,'dist'));
 const previous=JSON.parse(await readFile('dist/rates.json','utf8'));
 await writeFile(join(dir,'dist/rates.json'),JSON.stringify(previous));
 const mock=join(dir,'blocked.mjs');await writeFile(mock,"globalThis.fetch=async()=>{throw Error('Source indisponible simulée pour test');};");
 const run=spawnSync(process.execPath,['--import',mock,resolve('scripts/update-rates.mjs')],{cwd:dir,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const result=JSON.parse(await readFile(join(dir,'dist/rates.json'),'utf8'));
 assert.equal(result.schemaVersion,2);assert.equal(result.networkPolicy.mastercard.status,'unavailable');assert.equal(result.networkPolicy.visa.status,'unavailable');
 assert.equal(result.errors.length,24);
 assert.deepEqual(result.currencies,previous.currencies,'Ne pas changer les taux ni les dates quand les sources sont bloquées.');
 console.log('Actualisation : repli contrôlé sur 24 échecs simulés; taux/dates conservés; aucun taux réseau officiel inventé.');
}finally{await rm(dir,{recursive:true,force:true});}
