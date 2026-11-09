import {referenceRate,wiseRate} from './provenance.mjs';
const slots={rbc:'visa',bnc:'mastercard',wise:'wise'};
export function mergeSnapshots(previous,incoming){
 const out=structuredClone(incoming);out.currencies??={};
 for(const [currency,entry] of Object.entries(previous?.currencies||{})){
  for(const provider of Object.values(slots)){
   const old=entry[provider],next=out.currencies[currency]?.[provider];
   if(old?.status!=='official'||!old.validated)continue;
   if(!next||next.status!=='official'||!next.validated||Date.parse(old.collectedAt)>Date.parse(next.collectedAt)){
    (out.currencies[currency]??={})[provider]=structuredClone(old);
   }
  }
 }
 return out;
}
export function sourceTime(record){return record?.rateDate||record?.collectedAt||record?.stamp?.slice(0,10);}
export function freshness(record,now=Date.now(),hours=72){
 const raw=sourceTime(record),time=Date.parse(raw);
 if(!Number.isFinite(time))return {stale:true,ageHours:null};
 const ageHours=(now-time)/3600000;
 return {stale:ageHours>hours||ageHours < -5/60,ageHours};
}
export function ratesFor(snapshot,currency,{estimates=false,allowStale=false,now=Date.now()}={}){
 const entry=snapshot?.currencies?.[currency]||{},out={};
 for(const [id,provider] of Object.entries(slots)){
  const raw=entry[provider];let data=null;
  if(raw?.status==='official'&&raw.validated===true&&raw.provider===provider){
   data={...raw,estimated:false,label:`OFFICIEL · ${provider==='visa'?'Visa':provider==='mastercard'?'Mastercard':'Wise'}${raw.quote?' · devis pour le montant indiqué':''}`};
   if(raw.quote&&!raw.rateDate){data.label+=' · date effective non fournie';data.stamp='Collecté le '+raw.collectedAt;}
  }else if(id==='wise'&&raw?.status==='official'&&!raw.provider&&!estimates){
   // Ancien instantané, conservé avec son statut indicatif, jamais un devis carte.
   data=wiseRate(raw);
  }
  if(!data&&estimates){data=referenceRate(entry.reference);if(data)data={...data,feeHypothesis:true};}
  if(!data)continue;
  const age=freshness(data,now,data.estimated?(snapshot?.maxReferenceAgeHours||168):(snapshot?.maxAgeHours||72));
  data={...data,...age};
  if(age.stale){data.label+=' · PÉRIMÉ';data.usable=allowStale;data.reason='Taux périmé : saisissez un taux récent ou autorisez explicitement la simulation avec données anciennes.';}
  out[id]=data;
 }
 return out;
}
