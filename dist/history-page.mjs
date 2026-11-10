import {RATE_FIELDS,HEADERS,filterRecords,csvFor} from './history-core.mjs';
import {listHistory,listUsers,editDay,deleteDay} from './history-db.mjs';
const $=id=>document.getElementById(id);let all=[],shown=[],editing=null,deleting=null,loading=false;
const message=text=>{$('historyStatus').textContent=text;};
for(const [i,field] of RATE_FIELDS.entries()){
 const label=document.createElement('label');label.textContent=HEADERS[i+3];const input=document.createElement('input');input.id='edit-'+field;input.inputMode='decimal';input.placeholder='Vide si inconnu';label.append(input);$('editHistoryRates').append(label);
}
function openEdit(record){
 editing=record;$('editDate').value=record.date;$('editUser').value=record.user;$('editCurrency').value=record.currency;
 for(const field of RATE_FIELDS)$('edit-'+field).value=record[field]||'';
 $('currencyConfirmation').hidden=true;$('confirmCurrencyChange').checked=false;$('editHistoryStatus').textContent='';$('editHistory').showModal();
}
$('editCurrency').oninput=()=>{$('currencyConfirmation').hidden=$('editCurrency').value.toUpperCase()===editing?.currency;$('confirmCurrencyChange').checked=false;};
function render(){
 const from=$('filterFrom').value,to=$('filterTo').value;
 if(from&&to&&from>to){shown=[];$('historyRows').replaceChildren();$('historyCount').textContent='0 ligne';$('exportHistory').disabled=true;message('La date de début doit précéder la date de fin.');return;}
 shown=filterRecords(all,{from,to,user:$('filterUser').value,currency:$('filterCurrency').value});$('historyCount').textContent=`${shown.length} ligne${shown.length>1?'s':''}`;$('historyRows').replaceChildren();$('historyEmpty').hidden=shown.length>0;$('historyEmpty').textContent='Aucune ligne pour ces filtres. Enregistrez les taux depuis le calculateur.';
 for(const record of shown){
  const tr=document.createElement('tr');
  const values=[record.date,record.user,record.currency,...RATE_FIELDS.map(f=>record[f]||'—')];
  values.forEach((value,index)=>{
   const td=document.createElement('td');td.textContent=value;
   if(index===0){const actions=document.createElement('div');actions.className='historyActions';for(const [name,action] of [['Modifier',()=>openEdit(record)],['Supprimer',()=>{deleting=record;$('deleteHistoryText').textContent=`${record.date} · ${record.user} · ${record.currency}. Cette suppression est définitive sur cet appareil.`;$('deleteHistoryStatus').textContent='';$('deleteHistory').showModal();}]]){const button=document.createElement('button');button.type='button';button.className='light';button.textContent=name;button.onclick=action;actions.append(button);}td.append(actions);}
   if(index>=3){const meta=record.metadata?.sources?.[RATE_FIELDS[index-3]];if(meta){const note=document.createElement('small');note.textContent=[meta.label,meta.date,meta.feeMode==='inclusive'?`frais inclus ${meta.includedFeePct} %`:meta.feeMode==='exclusive'?'hors frais':null,meta.quote?`devis pour ${meta.quote.amount} ${meta.quote.currency} · total ${meta.quote.totalCad} CAD · frais ${meta.quote.feeCad} CAD · base reconstituée arrondie`:meta.feeCad!=null?`frais saisis ${meta.feeCad} CAD pour ${meta.amount} ${meta.currency}`:null].filter(Boolean).join(' · ');td.append(note);}}
   tr.append(td);
  });$('historyRows').append(tr);
 }
 $('exportHistory').disabled=false;
}
async function reload(){
 if(loading)return;loading=true;
 try{all=await listHistory();const users=await listUsers(),selectedUser=$('filterUser').value,selectedCurrency=$('filterCurrency').value;
  for(const [id,values,first,selected] of [['filterUser',users,'Tous les usagers',selectedUser],['filterCurrency',[...new Set(['EUR','USD','IDR','AUD','JPY','GBP','CHF','NZD','THB','MXN','SGD','HKD','CAD',...all.map(r=>r.currency)])].sort(),'Toutes les devises',selectedCurrency]]){
   const options=[['',first],...values.map(v=>[v,v])].map(([v,label])=>{const o=document.createElement('option');o.value=v;o.textContent=label;return o;});$(id).replaceChildren(...options);$(id).value=values.includes(selected)?selected:'';
  }render();message('Historique local chargé. Aucune donnée envoyée à un serveur.');
 }catch(e){message('Historique indisponible : '+e.message);$('historyEmpty').textContent='Le stockage local n’est pas accessible.';$('exportHistory').disabled=true;}finally{loading=false;}
}
$('historyFilters').onsubmit=e=>{e.preventDefault();render();};for(const id of ['filterFrom','filterTo','filterUser','filterCurrency'])$(id).onchange=()=>{message('');render();};$('historyFilters').onreset=()=>setTimeout(()=>{message('');render();},0);
$('exportHistory').onclick=()=>{const blob=new Blob([csvFor(shown)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='carte-claire-historique-unites-locales-par-CAD.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('closeEditHistory').onclick=()=>$('editHistory').close();
$('editHistoryForm').onsubmit=async e=>{
 e.preventDefault();const button=e.submitter||$('editHistoryForm').querySelector('button[type=submit]');button.disabled=true;
 try{const draft={...editing,date:$('editDate').value,user:$('editUser').value,currency:$('editCurrency').value};for(const f of RATE_FIELDS)draft[f]=$('edit-'+f).value;
  await editDay(editing,draft,{confirmCurrency:$('confirmCurrencyChange').checked});$('editHistory').close();await reload();message('Ligne modifiée.');
 }catch(err){$('editHistoryStatus').textContent=err.message;}finally{button.disabled=false;}
};
$('cancelDeleteHistory').onclick=()=>$('deleteHistory').close();$('confirmDeleteHistory').onclick=async()=>{
 $('confirmDeleteHistory').disabled=true;try{await deleteDay(deleting);$('deleteHistory').close();await reload();message('Ligne supprimée.');}catch(e){$('deleteHistoryStatus').textContent=e.message;}finally{$('confirmDeleteHistory').disabled=false;}
};
window.addEventListener('focus',reload);reload();
