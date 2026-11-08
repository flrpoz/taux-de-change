import assert from 'node:assert/strict';
import {calculate,defaults as productionDefaults,number,conversion} from '../dist/engine.mjs';
import {referenceRate,manualRate,wiseRate} from '../dist/provenance.mjs';
const defaults={...productionDefaults,estimates:true};
let checks=0;const close=(actual,expected)=>{assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);checks++;};
const rates={rbc:referenceRate({rate:1.5,stamp:'2026-10-30'}),bnc:referenceRate({rate:1.51,stamp:'2026-10-30'}),wise:wiseRate({rate:1.49,stamp:'2026-10-30T12:00:00Z'})};
const pick=(id,settings=defaults,manual={},category='other',currency='EUR')=>calculate(100,currency,category,settings,rates,manual).find(r=>r.id===id);
let r=pick('rbc');close(r.base,150);close(r.fee,3.75);close(r.reward,1.5);close(r.float,153.75*((1.08)**(21/365)-1));
close(pick('wise').fee,149*0.0075);close(pick('wise',defaults,{wiseFee:0}).gross,149);
close(pick('bnc',{...defaults,waiver:true}).fee,0);close(pick('rbc',{...defaults,days:0}).float,0);
close(pick('rbc',defaults,{},'travel').reward,1.875);
close(pick('bnc',{...defaults,monthly:2450},{},'food').points,50*5+101*2);
close(pick('bnc',{...defaults,monthly:2600},{},'food').points,151*2);
close(pick('wise',defaults,{},'other','CAD').gross,100);close(pick('rbc',defaults,{},'other','CAD').fee,0);
assert.equal(pick('bnc',{...defaults,estimates:false}).net,null);
assert.ok(calculate(100,'EUR','other',defaults,{}).every(r=>r.net===null));
assert.equal(number('1 234,56'),1234.56);assert.ok(Number.isNaN(number('abc')));
// Exemple fourni par l’utilisateur : taux Mastercard incluant 2,5 %.
const entered={rate:1.6052525,feeMode:'inclusive',includedFeePct:2.5,stamp:'2026-10-30 · heure non fournie',origin:'calculator'};
r=pick('bnc',defaults,{bnc:entered});
close(r.baseRate,1.5661);close(r.base,156.61);close(r.fee,3.91525);close(r.gross,160.52525);
assert.equal(r.gross.toFixed(2),'160.53');
close(r.reward,1.5661);close(r.float,r.gross*(1.08**(21/365)-1));close(r.net,r.gross-r.reward-r.float);
assert.notEqual(r.gross.toFixed(2),(100*1.6052525*1.025).toFixed(2));
// Même résultat avec un taux hors frais, ou un taux reconstitué à partir du total arrondi.
const excluded=pick('bnc',defaults,{bnc:{...entered,rate:1.5661,feeMode:'exclusive'}});
close(excluded.gross,r.gross);close(excluded.reward,r.reward);close(excluded.float,r.float);
close(pick('bnc',defaults,{bnc:{...entered,rate:160.53/100}}).gross,160.53);
// Exemption : retirer les frais déjà inclus, et ne pas garder le total avec frais.
const waived=pick('bnc',{...defaults,waiver:true},{bnc:entered});close(waived.gross,156.61);close(waived.fee,0);close(waived.reward,r.reward);
// Changement des paramètres : décodage au pourcentage du devis, application du nouveau pourcentage.
close(pick('bnc',{...defaults,bncFX:3},{bnc:entered}).gross,156.61*1.03);
// Visa : exact même convention de frais et priorité manuelle sur estimation désactivée.
const visa=pick('rbc',{...defaults,estimates:false},{rbc:entered});close(visa.gross,160.52525);close(visa.reward,1.5661);
assert.equal(visa.data.status,'manual');assert.match(visa.data.label,/officiel Visa déclaré/);
// Aucun libellé ou statut "official" hérité d’une référence mal étiquetée.
assert.equal(referenceRate({rate:1.5,stamp:'2026-10-30',status:'official',label:'Mastercard officiel'}).status,'estimated');
assert.doesNotMatch(referenceRate({rate:1.5,stamp:'2026-10-30'}).label,/OFFICIEL/);
assert.equal(manualRate('bnc',entered).status,'manual');
assert.equal(pick('bnc',defaults,{bnc:{...entered,includedFeePct:undefined}}).net,null);
assert.throws(()=>conversion(100,1.5,'inclusive',-2.5,2.5));
assert.throws(()=>conversion(100,1.5,'unknown',0,2.5));
assert.throws(()=>manualRate('wise',entered));
const sorted=calculate(100,'EUR','other',defaults,rates,{bnc:entered});assert.ok(sorted.every((v,i)=>!i||v.net>=sorted[i-1].net));
console.log(`Régressions réussies (${checks} comparaisons numériques + validations) : Mastercard 160,53 CAD, Visa, frais inclus/exclus, exemption, récompenses, délai, sources et classement.`);
console.log(JSON.stringify({mastercard:{base:r.base,fees:r.fee,total:r.gross,totalDisplayed:r.gross.toFixed(2),reward:r.reward,float:r.float,net:r.net}},null,2));
