import {writeFile,readFile} from 'node:fs/promises';
const codes=['EUR','USD','AUD','IDR','JPY','GBP','CHF','NZD','THB','MXN','SGD','HKD'];
let previous={currencies:{}};try{previous=JSON.parse(await readFile('dist/rates.json','utf8'));}catch{}
const networkPolicy={mastercard:{status:'unavailable',mode:'manual-or-estimated',reason:'API de production avec accès émetteur approuvé; aucun accès autorisé configuré. Calculateur public non interrogé automatiquement.'},visa:{status:'unavailable',mode:'manual-or-estimated',reason:'API de production avec accès approuvé et authentification; aucun accès autorisé configuré.'}};
const out={schemaVersion:2,networkPolicy,checkedAt:new Date().toISOString(),currencies:{},errors:[]};
for(const code of codes){
 const entry={};
 for(const kind of ['reference','wise']){
  const url=kind==='wise'?`https://wise.com/rates/live?source=${code}&target=CAD`:`https://api.frankfurter.dev/v1/latest?base=${code}&symbols=CAD`;
  try{const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);const r=await response.json();const rate=kind==='wise'?r.value:r.rates?.CAD;const stamp=kind==='wise'?new Date(r.time).toISOString():r.date+' · heure de fixation non fournie';if(!(rate>0)||!Number.isFinite(rate)||(kind==='wise'&&(r.source!==code||r.target!=='CAD'))||(kind==='reference'&&r.base!==code))throw Error('Réponse invalide');entry[kind]={rate,stamp,source:url,status:kind==='reference'?'estimated':'official',feeMode:'exclusive'};}
  catch(e){out.errors.push(`${code} ${kind}: ${e.message}`);if(previous.currencies?.[code]?.[kind])entry[kind]=previous.currencies[code][kind];}
 }
 out.currencies[code]=entry;
}
await writeFile('dist/rates.json',JSON.stringify(out,null,2)+'\n');console.log(`Updated ${codes.length} currencies; ${out.errors.length} unavailable sources (old dates preserved).`);

console.log('Visa / Mastercard : aucune récupération officielle automatique; estimation Frankfurter ou saisie manuelle explicite uniquement.');
