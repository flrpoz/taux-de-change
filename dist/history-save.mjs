import {RATE_FIELDS,UNIT,validateRecord} from './history-core.mjs';
import {getDay,saveDay,listUsers} from './history-db.mjs';
export function setupHistorySave(){
 const $=id=>document.getElementById(id);let displayed=null,busy=false;
 const status=text=>{$('historyStatus').textContent=text;};
 async function users(){try{$('historyUsers').replaceChildren(...(await listUsers()).map(id=>{const option=document.createElement('option');option.value=id;return option;}));}catch(e){status('Stockage local indisponible : '+e.message);}}
 users();
 function show(record){
  displayed=record;$('historyDay').textContent=record.date;$('historyPreview').replaceChildren();
  for(const field of RATE_FIELDS.filter(f=>!f.startsWith('real'))){
   const td=document.createElement('td');td.textContent=record[field]||'—';
   const meta=record.metadata.sources[field];if(meta){const note=document.createElement('small');note.textContent=[meta.label,meta.date,meta.feeMode==='inclusive'?`frais inclus ${meta.includedFeePct} %`:meta.feeMode==='exclusive'?'hors frais':null,meta.quote?`devis pour ${meta.quote.amount} ${meta.quote.currency} · total ${meta.quote.totalCad} CAD · frais ${meta.quote.feeCad} CAD · base reconstituée arrondie`:meta.feeCad!=null?`frais saisis ${meta.feeCad} CAD pour ${meta.amount} ${meta.currency}`:null,meta.stale?'PÉRIMÉ':null].filter(Boolean).join(' · ');td.append(note);}
   $('historyPreview').append(td);
  }
  status('Ces taux sont affichés en '+UNIT.toLowerCase()+'. Les taux réels seront ajoutés ultérieurement dans l’historique.');
 }
 function confirmReplace(existing,draft){
  const dialog=$('replaceHistory');$('replaceHistoryText').textContent=`Une ligne existe le ${draft.date} pour ${draft.user}, en ${existing.currency}. Remplacer ses taux estimés et officiels par cette comparaison en ${draft.currency} ? Les taux réels déjà saisis seront conservés.`;
  return new Promise(resolve=>{
   const finish=value=>{dialog.close();resolve(value);};$('replaceHistoryYes').onclick=()=>finish(true);$('replaceHistoryNo').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.showModal();
  });
 }
 $('saveHistory').onclick=async()=>{
  if(busy||!displayed)return;busy=true;$('saveHistory').disabled=true;
  try{
   const draft=validateRecord({...displayed,user:$('historyUser').value});const existing=await getDay(draft.date,draft.user);
   if(existing&&!(await confirmReplace(existing,draft))){status('Enregistrement annulé. La ligne existante est conservée.');return;}
   await saveDay(draft,{replace:!!existing,expectedRevision:existing?.revision});status(`Taux enregistrés pour ${draft.user}, le ${draft.date}, en ${draft.currency}. Stockage local à cet appareil.`);await users();
  }catch(e){status('Enregistrement impossible : '+e.message);}finally{busy=false;$('saveHistory').disabled=false;}
 };
 return {show};
}
