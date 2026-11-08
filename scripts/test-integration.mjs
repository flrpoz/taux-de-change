import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mergeOfficial,validateObservation,isAuthorized,sourceUrls} from './rates-core.mjs';
import {ratesFor,freshness,mergeSnapshots} from '../dist/snapshot.mjs';
import {calculate,defaults} from '../dist/engine.mjs';
const config=JSON.parse(await readFile('config/sources.json','utf8'));
const now=Date.parse('2026-11-08T13:00:00Z');
const allowed=structuredClone(config);
for(const p of Object.values(allowed.providers)){p.enabled=true;p.permission={collection:true,publication:true,evidence:'TEST UNIT — autorisation fictive, ne pas déployer',reviewedAt:'2026-11-08'};}
const base={schemaVersion:3,currencies:Object.fromEntries(config.currencies.map(c=>[c,{}]))};
function observation(provider,currency='EUR',overrides={}){
 return {provider,currency,amount:100,amount_cad:200,rate_cad_per_unit:'2.000000',bank_fee_percent:'0',source_url:sourceUrls[provider],final_url:sourceUrls[provider],status:'validated',selected_date:'11/08/2026',effective_date_displayed:'November 8th 2026',finished_at:'2026-11-08T12:59:00Z',script_sha256:'a'.repeat(64),screenshots:[{sha256:'b'.repeat(64)}],...overrides};
}
assert.equal(defaults.estimates,false);assert.equal(defaults.allowStale,false);
for(const p of Object.values(config.providers))assert.equal(isAuthorized(p,now),false);
assert.equal(isAuthorized({enabled:true,permission:{collection:true,publication:false,evidence:'not sufficient',reviewedAt:'2026-11-08'}},now),false);
for(const currency of config.currencies){
 for(const provider of ['mastercard','visa']){
  const o=observation(provider,currency);
  const entry=validateObservation(o,provider,currency,null,config,now);
  assert.equal(entry.rate,2);assert.equal(entry.rateDate,'2026-11-08');
 }
 const wise=validateObservation(observation('wise',currency,{amount_cad:'201',rate_cad_per_unit:null,fees_cad:{'Fixed fee':'0','Variable fee':'1','Total included fees':'1'}}),'wise',currency,null,config,now);
 const data=ratesFor({maxAgeHours:72,currencies:{[currency]:{wise}}},currency,{now});
 const row=calculate(100,currency,'other',defaults,data).find(r=>r.id==='wise');
 assert.equal(row.gross,201);assert.equal(row.fee,1);assert.equal(row.base,200);assert.equal(row.net,201);
 assert.equal(calculate(101,currency,'other',defaults,data).find(r=>r.id==='wise').net,null);
}
for(const change of [{testOnly:true},{error:'capture impossible'},{currency:'USD'},{bank_fee_percent:'2.5'},{amount_cad:'500'},{effective_date_displayed:'November 1st 2026'},{effective_date_displayed:'November 9th 2026'},{source_url:'https://example.invalid/'},{finished_at:'2026-12-01T00:00:00Z'},{screenshots:[]}]){
 assert.throws(()=>validateObservation(observation('mastercard','EUR',change),'mastercard','EUR',null,config,now));
}
assert.throws(()=>validateObservation(observation('wise','EUR',{fees_cad:{'Fixed fee':1,'Variable fee':2,'Total included fees':2}}),'wise','EUR',null,config,now));
assert.throws(()=>validateObservation(observation('visa'),'visa','EUR',{rate:1,collectedAt:'2026-11-08T11:00:00Z'},config,now));
const valid=mergeOfficial(base,[observation('visa')],allowed,now);
assert.equal(valid.currencies.EUR.visa.rate,2);
assert.deepEqual(mergeSnapshots(valid,base).currencies.EUR.visa,valid.currencies.EUR.visa,'Le cache local conserve un taux officiel absent du nouvel instantané');
const failed=mergeOfficial(valid,[],allowed,now+60000);
assert.deepEqual(failed.currencies.EUR.visa,valid.currencies.EUR.visa,'Une panne ne modifie ni le taux ni la date');
assert.equal(failed.collection['visa:EUR'].consecutiveFailures,1);
const again=mergeOfficial(failed,[],allowed,now+120000);
assert.equal(again.collection['visa:EUR'].consecutiveFailures,2);
const disabled=mergeOfficial(again,[observation('visa')],config,now+180000);
assert.deepEqual(disabled.currencies.EUR.visa,valid.currencies.EUR.visa);
const stale=structuredClone(valid);stale.currencies.EUR.reference={rate:1,stamp:'2026-11-08',status:'estimated'};
assert.equal(ratesFor(stale,'EUR',{now:now+7*86400000,estimates:true}).rbc.usable,false);
assert.equal(ratesFor(stale,'EUR',{now:now+7*86400000,estimates:true}).rbc.rate,2,'Un taux officiel périmé n’est pas remplacé par la référence');
assert.equal(ratesFor(base,'EUR',{now}).rbc,undefined);
assert.equal(freshness({stamp:'inconnue'},now).stale,true);
console.log('Intégration : 4 devises, devis Wise exact sans double frais, refus des devis de mauvais montant, données de test et dates invalides, conservation après panne, alertes répétées, aucun repli officiel vers estimation.');
