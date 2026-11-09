import {manualRate} from './provenance.mjs?v=20261109-2';
export const defaults={wiseFX:0.75,annual:8,days:21,rbcFX:2.5,bncFX:2.5,rbcValue:1,bncValue:1,rbcOther:1,rbcTravel:1.25,bncOther:1,bncFood:5,bncFoodOver:2,bncGas:2,bncRecurring:2,bncTravel:2,monthly:0,waiver:false,estimates:true,allowStale:false};
export function number(s){if(typeof s==='number')return s;return Number(String(s).trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));}
export function conversion(amount,rate,feeMode,includedFeePct,appliedFeePct){
 if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(amount)||amount<=0)throw Error('Montant ou taux invalide.');
 if(!Number.isFinite(appliedFeePct)||appliedFeePct<0)throw Error('Frais applicables invalides.');
 if(!['exclusive','inclusive'].includes(feeMode))throw Error('Convention de frais invalide.');
 if(feeMode==='inclusive'&&(!Number.isFinite(includedFeePct)||includedFeePct<0||includedFeePct>100))throw Error('Frais inclus invalides.');
 const baseRate=feeMode==='inclusive'?rate/(1+includedFeePct/100):rate;
 const base=amount*baseRate;
 // Décomposer le taux toutes taxes FX comprises, puis appliquer UNE seule fois les frais choisis.
 const gross=feeMode==='inclusive'&&includedFeePct===appliedFeePct?amount*rate:base*(1+appliedFeePct/100);
 return {baseRate,base,fee:gross-base,gross};
}
export function calculate(amount,currency,category,s,rates,manual={}){
 return ['rbc','bnc','wise'].map(id=>{
  let data;
  try{data=currency==='CAD'?{rate:1,label:'AUCUNE CONVERSION · CAD → CAD',stamp:'Sans objet',status:'identity',feeMode:'exclusive'}:manual[id]?manualRate(id,manual[id]):rates[id];}catch(e){return {id,net:null,reason:e.message};}
  if(data?.usable===false)return {id,data,net:null,reason:data.reason};
  if(id==='wise'&&data?.quote&&(data.quote.currency!==currency||Math.abs(data.quote.amount-amount)>1e-9))return {id,data,net:null,reason:`Devis Wise disponible pour ${data.quote.amount} ${data.quote.currency} seulement. Saisissez le taux et les frais de cet achat.`};
  if(!data||((data.estimated||data.status==='estimated')&&id!=='wise'&&!s.estimates)||!Number.isFinite(data.rate)||data.rate<=0)return {id,net:null,reason:'Taux indisponible'};
  let converted;
  const appliedFeePct=currency==='CAD'?0:id==='rbc'?s.rbcFX:id==='bnc'?(s.waiver?0:s.bncFX):s.wiseFX;
  try{converted=conversion(amount,data.rate,data.feeMode||'exclusive',data.includedFeePct,appliedFeePct);}catch(e){return {id,data,net:null,reason:e.message};}
  let {base,fee,gross,baseRate}=converted;
  if(id==='wise'&&data.quote){gross=data.quote.totalCad;fee=data.quote.feeCad;base=gross-fee;baseRate=base/amount;}
  if(id==='wise'&&currency!=='CAD'&&manual.wiseFee!=null){fee=manual.wiseFee;gross=base+fee;}
  let points=0;
  if(id==='rbc')points=base*(['travel','bnctravel'].includes(category)?s.rbcTravel:s.rbcOther);
  if(id==='bnc'){
   const multipliers={other:s.bncOther,travel:s.bncOther,gas:s.bncGas,recurring:s.bncRecurring,bnctravel:s.bncTravel};
   if(category==='food'){const eligible=Math.min(base,Math.max(0,2500-s.monthly));points=eligible*s.bncFood+(base-eligible)*s.bncFoodOver;}
   else points=base*(multipliers[category]??s.bncOther);
  }
  const reward=points*(id==='rbc'?s.rbcValue:s.bncValue)/100;
  const known=Number.isFinite(fee)&&fee>=-1e-10;
  const float=id==='wise'?0:known?gross*(Math.pow(1+s.annual/100,s.days/365)-1):0;
  return {id,base,baseRate,gross,fee:known?Math.max(0,fee):null,reward,float,points,net:known?gross-reward-float:null,data,appliedFeePct,reason:known?'':'Frais invalides',simulation:id==='bnc'&&s.waiver};
 }).sort((a,b)=>(a.net??Infinity)-(b.net??Infinity));
}
