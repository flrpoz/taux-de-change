import {writeFile,readFile,rename,mkdir} from 'node:fs/promises';
import {mergeOfficial} from './rates-core.mjs';
const config=JSON.parse(await readFile('config/sources.json','utf8'));
const previous=JSON.parse(await readFile('dist/rates.json','utf8'));
let observations=[];
try{observations=JSON.parse(await readFile('artifacts/observations.json','utf8'));}catch{}
const out=mergeOfficial(previous,observations,config);
if(config.referenceEnabled&&!process.argv.includes('--offline')){
 for(const code of Object.keys(out.currencies)){
  try{
   const url=`https://api.frankfurter.dev/v1/latest?base=${code}&symbols=CAD`;
   const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const r=await response.json();if(r.base!==code||!(r.rates?.CAD>0)||!Number.isFinite(r.rates.CAD)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw Error('Réponse invalide');
   out.currencies[code].reference={rate:r.rates.CAD,stamp:r.date+' · heure de fixation non fournie',rateDate:r.date,source:url,status:'estimated',feeMode:'exclusive'};
  }catch{out.errors.push(`${code} reference: collecte indisponible; taux et date précédents conservés`);}
 }
}
await mkdir('artifacts',{recursive:true});
await writeFile('dist/rates.json.tmp',JSON.stringify(out,null,2)+'\n');
await rename('dist/rates.json.tmp','dist/rates.json');
await writeFile('artifacts/update-log.json',JSON.stringify({at:out.checkedAt,errors:out.errors,collection:out.collection},null,2)+'\n');
console.log(`Instantané conservé/actualisé; ${out.errors.length} erreurs. Aucun taux officiel remplacé par une référence.`);
