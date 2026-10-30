import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const required=['index.html','app.js','engine.mjs','style.css','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','rates.json'];
for(const file of required)assert.ok((await stat('dist/'+file)).size>0,`${file} absent ou vide`);
const html=await readFile('dist/index.html','utf8');
assert.match(html,/rel="apple-touch-icon" href="icon-180.png"/);
assert.match(html,/src="app.js"/);
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons)await stat('dist/'+icon.src);
const rates=JSON.parse(await readFile('dist/rates.json','utf8'));
assert.equal(Object.keys(rates.currencies).length,12);
for(const [code,entry] of Object.entries(rates.currencies))for(const value of Object.values(entry)){assert.ok(Number.isFinite(value.rate)&&value.rate>0,code);assert.ok(value.stamp,code);}
console.log('Paquet valide : dist, 12 devises, chemins relatifs et icônes iPhone/iPad.');
