import {defaults,number,calculate} from './engine.mjs';
const $=id=>document.getElementById(id), money=n=>n==null?'Indisponible':new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(n);
let settings={...defaults}, storageOK=true;
try{const v=JSON.parse(localStorage.getItem('carte-claire-v1')||'{}');for(const k of Object.keys(defaults)){if(typeof defaults[k]==='boolean'){if(typeof v[k]==='boolean')settings[k]=v[k];}else if(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1e9)settings[k]=v[k];}}catch{storageOK=false;}
let manual={}, snapshot=null, last=null, busy=false;
const names={rbc:'RBC Avion Visa Infinite',bnc:'BNC World Elite Mastercard',wise:'Wise Debit'};
const groups=[['Wise Debit', [['wiseFX','Frais Wise estimés (%)',100]]],['Hypothèses de calcul',[['annual','Rendement annuel (%)',100],['days','Délai de paiement (jours)',365],['monthly','Achats mensuels BNC déjà portés (CAD)',1e8]]],['RBC Avion',[['rbcFX','Frais FX (%)',100],['rbcValue','Valeur d’un point (cents CAD)',100],['rbcOther','Points/$ — autres catégories',100],['rbcTravel','Points/$ — voyage',100]]],['BNC World Elite',[['bncFX','Frais FX (%)',100],['bncValue','Valeur d’un point (cents CAD)',100],['bncOther','Points/$ — autres achats',100],['bncFood','Points/$ — épicerie et restaurant',100],['bncFoodOver','Points/$ — après seuil mensuel',100],['bncGas','Points/$ — essence et recharge',100],['bncRecurring','Points/$ — récurrent',100],['bncTravel','Points/$ — agence Voyage À la carte',100]]]];
$('settingFields').innerHTML=groups.map(([title,fields])=>`<h3>${title}</h3><div class="settingsGrid">${fields.map(([id,label,max])=>`<label for="s-${id}">${label}<input type="number" id="s-${id}" min="0" max="${max}" step="any" required></label>`).join('')}</div>`).join('');
function fill(){for(const k in defaults)if($(('s-'+k)))$('s-'+k).value=settings[k];$('waiver').checked=settings.waiver;$('estimates').checked=settings.estimates;}
$('settingsButton').onclick=()=>{fill();$('settings').showModal();};$('closeSettings').onclick=()=>$('settings').close();
$('settingsForm').onsubmit=e=>{e.preventDefault();for(const k in defaults)if($('s-'+k))settings[k]=number($('s-'+k).value);settings.waiver=$('waiver').checked;settings.estimates=$('estimates').checked;try{localStorage.setItem('carte-claire-v1',JSON.stringify(settings));storageOK=true;}catch{storageOK=false;}$('settings').close();if(last)render();else $('status').textContent=storageOK?'Paramètres enregistrés.':'Stockage indisponible : paramètres conservés pour cette session seulement.';};
$('reset').onclick=()=>{settings={...defaults};fill();};
$('manualFields').innerHTML=['rbc','bnc','wise'].map(id=>`<label>${names[id]} — CAD / unité locale<input inputmode="decimal" id="m-${id}" placeholder="Laisser vide si inconnu"></label><label>Date et heure du taux ${id.toUpperCase()}<input type="datetime-local" id="t-${id}"></label>`).join('')+'<label>Frais du devis Wise (CAD, pour cet achat)<input inputmode="decimal" id="wiseFee" placeholder="Requis pour classer Wise"></label>';
function clearManual(){manual={};document.querySelectorAll('#manualFields input').forEach(el=>el.value='');if(last){last=null;$('results').hidden=true;$('status').textContent='Montant ou devise modifié : appuyez sur Comparer.';}}
$('amount').oninput=clearManual;$('currency').onchange=clearManual;$('category').onchange=()=>{if(last){last.category=$('category').value;render();}};
$('applyManual').onclick=()=>compare(true);$('compareForm').onsubmit=e=>{e.preventDefault();compare(true);};
async function readJSON(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function loadRates(currency){
 if(currency==='CAD')return {};
 let ref=null,wise=null;
 try{const r=await readJSON(`https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=CAD`);if(r.base===currency&&r.rates?.CAD>0&&/^\d{4}-\d{2}-\d{2}$/.test(r.date))ref={rate:r.rates.CAD,label:'Référence Frankfurter · ESTIMÉ',stamp:r.date+' · heure de fixation non fournie',estimated:true};}catch{}
 if(!ref){try{snapshot=await readJSON('./rates.json');const r=snapshot.currencies?.[currency]?.reference;if(r?.rate>0)ref={...r,estimated:true,label:'Référence Frankfurter · ESTIMÉ'};}catch{}}
 try{const r=await readJSON(`https://wise.com/rates/live?source=${currency}&target=CAD`);if(r.source===currency&&r.target==='CAD'&&r.value>0&&Number.isFinite(r.time))wise={rate:r.value,label:'Wise · taux indicatif public',stamp:new Date(r.time).toLocaleString('fr-CA')};}catch{}
 if(!wise){try{snapshot??=await readJSON('./rates.json');const r=snapshot.currencies?.[currency]?.wise;if(r?.rate>0)wise={...r,label:'Wise · instantané indicatif'};}catch{}}
 return {rbc:ref,bnc:ref,wise:wise||ref};
}
async function compare(readManual){
 if(busy)return;const amount=number($('amount').value),currency=$('currency').value;
 if(!Number.isFinite(amount)||amount<=0||amount>1e10){$('status').textContent='Entrez un montant positif valide (ex. 125,50).';return;}
 if(readManual){const next={};for(const id of ['rbc','bnc','wise']){const raw=$('m-'+id).value.trim();if(raw){const rate=number(raw),date=$('t-'+id).value;if(!Number.isFinite(rate)||rate<=0||!date||new Date(date)>new Date()){ $('status').textContent='Un taux manuel exige une valeur positive et une date/heure non future.';$('manual').open=true;return;}next[id]={rate,stamp:new Date(date).toLocaleString('fr-CA')};}}
 const raw=$('wiseFee').value.trim();if(raw){const fee=number(raw);if(!Number.isFinite(fee)||fee<0){$('status').textContent='Les frais Wise doivent être positifs ou nuls.';return;}next.wiseFee=fee;}manual=next;}
 busy=true;const button=$('compareForm').querySelector('button');button.disabled=true;button.textContent='Recherche des taux…';$('status').textContent='Récupération des dernières données accessibles…';
 const rates=await loadRates(currency);last={amount,currency,category:$('category').value,rates,checked:new Date().toLocaleString('fr-CA')};busy=false;button.disabled=false;button.innerHTML='Comparer <span>↗</span>';
 if(number($('amount').value)!==amount||$('currency').value!==currency){last=null;$('status').textContent='Achat modifié : appuyez sur Comparer.';return;}render();
}
function render(){if(!last)return;const {amount,currency,category,rates}=last;const rows=calculate(amount,currency,category,settings,rates,manual),known=rows.filter(x=>x.net!=null),best=known[0],all=known.length===3;
 $('results').hidden=false;$('context').textContent=`${amount.toLocaleString('fr-CA')} ${currency} → CAD`;
 $('summary').textContent=best?(all?`${names[best.id]} : minimum estimé de ${money(best.net)}. Économie estimée de ${money(known.at(-1).net-best.net)} par rapport à la plus chère.`:`Comparaison partielle : ${names[best.id]} est la moins chère des ${known.length} cartes chiffrables. Aucun gagnant global tant que les données manquent.`):'Comparaison impossible : renseignez les taux et les frais manquants.';
 $('rows').replaceChildren(...rows.map((r,i)=>{const tr=document.createElement('tr');if(i===0&&best)tr.className='win';const cell=(text,cls)=>{const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;tr.append(td);return td;};const first=cell((r.net!=null?`${i+1}. `:'— ')+names[r.id]);const note=document.createElement('small');note.textContent=r.data?`${r.data.label}${r.simulation?' · EXEMPTION SIMULÉE':''} · ${r.data.stamp}`:r.reason;first.append(note);cell(money(r.base));const fc=cell(money(r.fee));if(r.id==='wise'&&r.fee!=null&&currency!=='CAD'){const fn=document.createElement('small');fn.textContent=manual.wiseFee!=null?'Devis saisi manuellement · cet achat':`${settings.wiseFX} % · hypothèse utilisateur`;fc.append(fn);}cell(money(r.reward));cell(money(r.float));cell(money(r.net),'net');cell(r.net!=null?money(r.net-best.net):r.reason);return tr;}));
 $('status').textContent=`Consultation : ${last.checked}. ${currency==='CAD'?'Aucune conversion.':'Visa et Mastercard : accès automatique non disponible; toute référence est une simulation. Les instantanés peuvent être anciens : vérifiez les dates affichées.'}${storageOK?'':' Stockage local indisponible.'}`;
 $('sources').textContent='Les dates affichées sous chaque carte sont celles de la source ou de la saisie, distinctes de l’heure de consultation. Les taux du jour ne garantissent pas le taux de règlement. Aucune valeur manquante n’est remplacée par zéro.';
}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
