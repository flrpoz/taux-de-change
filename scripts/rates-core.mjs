import {freshness} from '../dist/snapshot.mjs';
export const sourceUrls={mastercard:'https://www.mastercard.com/ca/en/personal/get-support/currency-exchange-rate-converter.html',visa:'https://www.visa.ca/en_CA/support/consumer/travel-support/exchange-rate-calculator.html',wise:'https://wise.com/ca/pricing/card-fees'};
export function isAuthorized(policy,now=Date.now()){
 const p=policy?.permission;
 return policy?.enabled===true&&p?.collection===true&&p?.publication===true&&typeof p.evidence==='string'&&p.evidence.trim().length>10&&/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt||'')&&Date.parse(p.reviewedAt)<=now&&(!p.expiresAt||Date.parse(p.expiresAt)>now);
}
function positive(n){return Number.isFinite(Number(n))&&Number(n)>0;}
function assert(condition,message){if(!condition)throw Error(message);}
export function validateObservation(o,provider,currency,previous,config,now=Date.now()){
 assert(o&&o.status==='validated'&&!o.testOnly&&!o.error,'Collecte absente, non validée ou données de test');
 assert(o.provider===provider&&o.currency===currency,'Fournisseur ou devise incorrects');
 assert(o.source_url===sourceUrls[provider]&&new URL(o.final_url||o.source_url).hostname===new URL(sourceUrls[provider]).hostname,'Source officielle incorrecte');
 assert(positive(o.amount)&&positive(o.amount_cad),'Montants invalides');
 assert(Number.isFinite(Date.parse(o.finished_at))&&now-Date.parse(o.finished_at)<24*3600000&&Date.parse(o.finished_at)<=now+300000,'Collecte trop ancienne ou future');
 assert(/^[a-f0-9]{64}$/.test(o.script_sha256||'')&&/^[a-f0-9]{64}$/.test(o.screenshots?.at(-1)?.sha256||''),'Preuve de collecte absente');
 let date=null,rate,quote;
 if(provider==='wise'){
  const f=o.fees_cad,total=Number(f?.['Total included fees']),fixed=Number(f?.['Fixed fee']),variable=Number(f?.['Variable fee']);
  assert(f&&[total,fixed,variable].every(n=>Number.isFinite(n)&&n>=0)&&Math.abs(total-fixed-variable)<1e-8&&total<Number(o.amount_cad),'Frais Wise incohérents');
  quote={amount:Number(o.amount),currency,totalCad:Number(o.amount_cad),feeCad:total};
  rate=(quote.totalCad-total)/quote.amount;
 }else{
  assert(String(o.bank_fee_percent)==='0','Frais bancaires déjà inclus');
  assert(positive(o.rate_cad_per_unit),'Taux absent');
  rate=Number(o.amount_cad)/Number(o.amount); // conserve la précision du total Visa, IDR notamment
  const printed=Number(o.rate_cad_per_unit),digits=(String(o.rate_cad_per_unit).split('.')[1]||'').length;
  assert(Math.abs(rate-printed)<=0.5*10**(-digits)+0.005/Number(o.amount)+1e-12,'Taux/total incohérents');
  const text=provider==='visa'?o.selected_date:String(o.effective_date_displayed).replace(/(\d)(st|nd|rd|th)/,'$1');
  const parsed=provider==='visa'?Date.parse(text+' 00:00:00 GMT'):Date.parse(text+' 00:00:00 GMT');
  assert(Number.isFinite(parsed),'Date source absente ou invalide');date=new Date(parsed).toISOString().slice(0,10);
  assert(!freshness({rateDate:date},now,config.maxAgeHours).stale,'Date source périmée');
 }
 assert(positive(rate),'Taux calculé invalide');
 // Un taux conservé vieux de plusieurs jours ne représente pas une variation quotidienne.
 if(previous?.rate&&now-Date.parse(previous.collectedAt||previous.stamp)<48*3600000){
  assert(Math.abs(rate/previous.rate-1)*100<=config.maxDailyChangePercent,'Variation anormale : résultat mis en quarantaine');
 }
 return {provider,status:'official',validated:true,rate,rateDisplayed:o.rate_cad_per_unit||null,precision:quote?'base reconstituée depuis un devis arrondi':'calculé depuis le montant officiel affiché',feeMode:'exclusive',includedFeePct:0,stamp:date||o.finished_at,rateDate:date,collectedAt:o.finished_at,source:sourceUrls[provider],sourceName:provider,quote:quote||null,proof:{collectorSha256:o.script_sha256||null,screenshotSha256:o.screenshots?.at(-1)?.sha256||null}};
}
export function mergeOfficial(snapshot,observations,config,now=Date.now()){
 const out=structuredClone(snapshot);out.schemaVersion=3;out.maxAgeHours=config.maxAgeHours;out.checkedAt=new Date(now).toISOString();out.currencies??={};out.collection??={};out.networkPolicy??={};out.errors=[];
 for(const [provider,policy] of Object.entries(config.providers)){
  const authorized=isAuthorized(policy,now);
  out.networkPolicy[provider]={status:authorized?'enabled':'manual',reason:authorized?'Collecte quotidienne autorisée configurée.':policy.reason,termsUrl:policy.termsUrl};
  for(const currency of config.currencies){
   const key=provider+':'+currency,old=out.collection[key]||{},entry=out.currencies[currency]??={};
   if(!authorized){out.collection[key]={...old,state:'manual',reason:policy.reason};continue;}
   try{
    const candidate=observations.find(o=>o.provider===provider&&o.currency===currency);
    const next=validateObservation(candidate,provider,currency,entry[provider],config,now);
    entry[provider]=next;out.collection[key]={state:'ok',attemptedAt:out.checkedAt,lastSuccessAt:next.collectedAt,consecutiveFailures:0};
   }catch(e){
    const reason=e.message;out.collection[key]={...old,state:'failed',attemptedAt:out.checkedAt,reason,consecutiveFailures:(old.consecutiveFailures||0)+1};out.errors.push(`${key}: ${reason}`);
   }
  }
 }
 return out;
}
