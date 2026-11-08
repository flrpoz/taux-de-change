import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {personalAllowed} from './personal-policy.mjs';
import {isAuthorized,mergeOfficial} from './rates-core.mjs';
import {runPersonal,privateDirectory,root} from './personal-run.mjs';
const config=JSON.parse(await readFile(new URL('../config/personal-sources.json',import.meta.url)));
const now=Date.parse('2026-11-08T20:00Z');
assert(!personalAllowed(config,'mastercard',now));assert(personalAllowed(config,'visa',now));assert(personalAllowed(config,'wise',now));
assert(!personalAllowed(config,'visa',Date.parse('2027-01-01')));assert(!personalAllowed({...config,scope:'public'},'visa',now));
assert(!isAuthorized(config.providers.visa,now)); // never mint a publication grant
assert.throws(()=>privateDirectory({CARTE_CLAIRE_PRIVATE_DIR:root+'/private-data'}));
await assert.rejects(runPersonal({env:{GITHUB_ACTIONS:'true'}}),/interdite/);
const snapshot={currencies:{},collection:{}};
for(const c of config.currencies)snapshot.currencies[c]={visa:{provider:'visa',status:'official',validated:true,rate:2,collectedAt:'2026-11-07T12:00Z',rateDate:'2026-11-07'},wise:{provider:'wise',status:'official',validated:true,rate:2,collectedAt:'2026-11-07T12:00Z',quote:{amount:100,currency:c,totalCad:201,feeCad:1}}};
const failed=mergeOfficial(snapshot,[],config,now,{personal:true});
for(const c of config.currencies){assert.deepEqual(failed.currencies[c],snapshot.currencies[c]);assert.equal(failed.collection['visa:'+c].consecutiveFailures,1);}
const twice=mergeOfficial(failed,[],config,now,{personal:true});assert.equal(twice.collection['wise:JPY'].consecutiveFailures,2);
const expired=mergeOfficial(snapshot,[],config,Date.parse('2027-01-01'),{personal:true});assert.equal(expired.collection['visa:JPY'].state,'manual');
const publicAttempt=mergeOfficial(snapshot,[],config,now);assert.equal(publicAttempt.collection['visa:JPY'].state,'manual');
console.log('Privé : cinq devises, conservation exacte après panne, échecs répétés, revue expirée, publication refusée, stockage hors dépôt et Actions public refusé. Tests synthétiques uniquement.');
