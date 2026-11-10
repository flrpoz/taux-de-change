export const PROVIDERS=['Mastercard','Visa','Wise'];
export const TYPES=['estimated','official','real'];
export const RATE_FIELDS=TYPES.flatMap(t=>PROVIDERS.map(p=>t+p));
export const HEADERS=['Date','Usager','Devise',...['estimé','officiel','réel'].flatMap(t=>PROVIDERS.map(p=>`Taux ${t} — ${p}`))];
export const UNIT='Unités locales pour 1 CAD';
export function localDay(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
export function canonicalRate(value){
 let s=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'');if(!s)return '';
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else s=s.replace(',','.');
 s=s.replace(/^\+/,'');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)||!Number.isFinite(Number(s))||Number(s)<=0)throw Error('Chaque taux doit être positif, ou laissé vide.');
 return s; // garde les décimales saisies, sans conversion/arrondi du texte
}
export function validateRecord(input){
 const date=String(input.date||''),user=String(input.user||'').trim().normalize('NFC'),currency=String(input.currency||'').trim().toUpperCase();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Date invalide.');
 if(!user||user.length>64||/[\x00-\x1f\x7f]/.test(user))throw Error('Choisissez un identifiant usager de 1 à 64 caractères.');
 if(!/^[A-Z]{3}$/.test(currency))throw Error('Devise invalide.');
 const out={...input,date,user,currency,unit:UNIT};for(const field of RATE_FIELDS)out[field]=canonicalRate(input[field]);return out;
}
export function mergeDaily(existing,draft,now=new Date().toISOString()){
 const next=validateRecord(draft);
 if(existing&&existing.currency!==next.currency&&PROVIDERS.some(p=>existing['real'+p]))throw Error('Cette journée contient déjà des taux réels dans une autre devise. Modifiez et vérifiez la ligne dans l’historique.');
 if(existing){const sources={...(next.metadata?.sources||{})};for(const p of PROVIDERS){next['real'+p]=existing['real'+p]||'';if(existing.metadata?.sources?.['real'+p])sources['real'+p]=existing.metadata.sources['real'+p];}next.metadata={...next.metadata,sources};}
 return {...next,createdAt:existing?.createdAt||now,updatedAt:now,revision:(existing?.revision||0)+1};
}
export function csvFor(records){
 const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
 const safeUser=s=>/^[\s]*[=+\-@]/.test(s)?"'"+s:s;
 return '\uFEFF'+[HEADERS,...records.map(r=>[r.date,safeUser(r.user),r.currency,...RATE_FIELDS.map(f=>r[f]||'')])].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
}
export function filterRecords(records,{from='',to='',user='',currency=''}={}){
 return records.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)&&(!user||r.user===user)&&(!currency||r.currency===currency)).sort((a,b)=>b.date.localeCompare(a.date)||a.user.localeCompare(b.user));
}
export function comparisonRecord(comparison,manual,snapshot){
 const record={date:comparison.day||localDay(),user:'',currency:comparison.currency,metadata:{capturedAt:comparison.capturedAt,amount:comparison.amount,sources:{}},unit:UNIT};
 for(const f of RATE_FIELDS)record[f]='';
 const entry=snapshot?.currencies?.[comparison.currency]||{};
 const reference=entry.reference;
 for(const [provider,id,key] of [['Mastercard','bnc','mastercard'],['Visa','rbc','visa'],['Wise','wise','wise']]){
  if(comparison.currency==='CAD'){record['estimated'+provider]='1';record.metadata.sources['estimated'+provider]={label:'Sans conversion CAD → CAD'};continue;}
  if(Number.isFinite(reference?.rate)&&reference.rate>0){record['estimated'+provider]=String(1/reference.rate);record.metadata.sources['estimated'+provider]={rateCadPerUnit:reference.rate,source:reference.source,date:reference.rateDate||reference.stamp,label:'Référence estimée de banques centrales',feeMode:'exclusive'};}
  const m=manual[id],raw=comparison.rates[id];let value='',meta;
  if(m?.origin==='calculator'){
   value=m.inputRate||String(1/m.rate);meta={label:'Calculateur officiel recopié par l’usager, non vérifié',date:m.rateDate,feeMode:m.feeMode,includedFeePct:m.includedFeePct,quote:m.quote||null,...(provider==='Wise'&&manual.wiseFee!=null?{feeCad:manual.wiseFee,amount:comparison.amount,currency:comparison.currency}:{})};
  }else if(!m&&raw?.status==='official'&&raw.validated&&!raw.estimated){
   value=String(1/raw.rate);meta={label:raw.quote?'Base reconstituée du devis carte arrondi':'Résultat officiel validé',date:raw.rateDate||raw.collectedAt,source:raw.source,feeMode:raw.feeMode,quote:raw.quote||null,stale:raw.stale};
  }
  if(value){record['official'+provider]=value;record.metadata.sources['official'+provider]=meta;}
 }
 return record;
}
