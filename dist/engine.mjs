export const defaults={wiseFX:0.75,annual:8,days:21,rbcFX:2.5,bncFX:2.5,rbcValue:1,bncValue:1,rbcOther:1,rbcTravel:1.25,bncOther:1,bncFood:5,bncFoodOver:2,bncGas:2,bncRecurring:2,bncTravel:2,monthly:0,waiver:false,estimates:true};
export function number(s){if(typeof s==='number')return s;return Number(String(s).trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));}
export function calculate(amount,currency,category,s,rates,manual={}){
 const kinds=['rbc','bnc','wise'];
 return kinds.map(id=>{
  const m=manual[id]; const manualRate=m?.rate>0;
  const data=currency==='CAD'?{rate:1,label:'CAD → CAD',stamp:'Aucune conversion'}:manualRate?{rate:m.rate,label:'Taux manuel déclaré',stamp:m.stamp}:rates[id];
  const allowed=data && (id==='wise'||!data.estimated||s.estimates);
  if(!allowed||!Number.isFinite(data.rate)||data.rate<=0)return {id,net:null,reason:'Taux indisponible'};
  const base=amount*data.rate;
  let fee=currency==='CAD'?0:id==='wise'?(currency==='CAD'?0:(manual.wiseFee??base*s.wiseFX/100)):base*(id==='rbc'?s.rbcFX:(s.waiver?0:s.bncFX))/100;
  let points=0;
  if(id==='rbc')points=base*(['travel','bnctravel'].includes(category)?s.rbcTravel:s.rbcOther);
  if(id==='bnc'){
   const multipliers={other:s.bncOther,travel:s.bncOther,gas:s.bncGas,recurring:s.bncRecurring,bnctravel:s.bncTravel};
   if(category==='food'){const eligible=Math.min(base,Math.max(0,2500-s.monthly));points=eligible*s.bncFood+(base-eligible)*s.bncFoodOver;}
   else points=base*(multipliers[category]??s.bncOther);
  }
  const reward=points*(id==='rbc'?s.rbcValue:s.bncValue)/100;
  const known=Number.isFinite(fee)&&fee>=0;
  const float=id==='wise'?0:known?(base+fee)*(Math.pow(1+s.annual/100,s.days/365)-1):0;
  return {id,base,fee:known?fee:null,reward,float,points,net:known?base+fee-reward-float:null,data,reason:known?'':'Frais Wise requis',simulation:id==='bnc'&&s.waiver};
 }).sort((a,b)=>(a.net??Infinity)-(b.net??Infinity));
}
