import {defaults,number,calculate} from './engine.mjs?v=20261109-2';
import {calculators} from './provenance.mjs?v=20261109-2';
import {ratesFor,mergeSnapshots} from './snapshot.mjs?v=20261109-2';
const $=id=>document.getElementById(id), money=n=>n==null?'Indisponible':new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(n);
let settings={...defaults}, storageOK=true;
try{const current=localStorage.getItem('carte-claire-v5');const v=JSON.parse(current||localStorage.getItem('carte-claire-v4')||localStorage.getItem('carte-claire-v3')||localStorage.getItem('carte-claire-v1')||'{}');for(const k of Object.keys(defaults)){if(typeof defaults[k]==='boolean'){if(typeof v[k]==='boolean')settings[k]=v[k];}else if(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1e9)settings[k]=v[k];}if(!current)settings.estimates=true;localStorage.setItem('carte-claire-v5',JSON.stringify(settings));}catch{storageOK=false;}
let manual={}, snapshot=null, last=null, busy=false, rateLoadError='';
const names={rbc:'RBC Avion Visa Infinite',bnc:'BNC World Elite Mastercard',wise:'Wise Debit'};
const groups=[['Wise Debit', [['wiseFX','Frais Wise estimés (%)',100]]],['Hypothèses de calcul',[['annual','Rendement annuel (%)',100],['days','Délai de paiement (jours)',365],['monthly','Achats mensuels BNC déjà portés (CAD)',1e8]]],['RBC Avion',[['rbcFX','Frais FX (%)',100],['rbcValue','Valeur d’un point (cents CAD)',100],['rbcOther','Points/$ — autres catégories',100],['rbcTravel','Points/$ — voyage',100]]],['BNC World Elite',[['bncFX','Frais FX (%)',100],['bncValue','Valeur d’un point (cents CAD)',100],['bncOther','Points/$ — autres achats',100],['bncFood','Points/$ — épicerie et restaurant',100],['bncFoodOver','Points/$ — après seuil mensuel',100],['bncGas','Points/$ — essence et recharge',100],['bncRecurring','Points/$ — récurrent',100],['bncTravel','Points/$ — agence Voyage À la carte',100]]]];
$('settingFields').innerHTML=groups.map(([title,fields])=>`<h3>${title}</h3><div class="settingsGrid">${fields.map(([id,label,max])=>`<label for="s-${id}">${label}<input type="number" id="s-${id}" min="0" max="${max}" step="any" required></label>`).join('')}</div>`).join('');
function fill(){for(const k in defaults)if($(('s-'+k)))$('s-'+k).value=settings[k];$('waiver').checked=settings.waiver;$('estimates').checked=settings.estimates;$('allowStale').checked=settings.allowStale;}
$('settingsButton').onclick=()=>{fill();$('settings').showModal();};$('closeSettings').onclick=()=>$('settings').close();
$('settingsForm').onsubmit=e=>{e.preventDefault();for(const k in defaults)if($('s-'+k))settings[k]=number($('s-'+k).value);settings.waiver=$('waiver').checked;settings.estimates=$('estimates').checked;settings.allowStale=$('allowStale').checked;try{localStorage.setItem('carte-claire-v5',JSON.stringify(settings));storageOK=true;}catch{storageOK=false;}$('settings').close();renderHealth();if(last){last.rates=ratesFor(snapshot,last.currency,settings);render();}else $('status').textContent=storageOK?'Paramètres enregistrés.':'Stockage indisponible : paramètres conservés pour cette session seulement.';};
$('reset').onclick=()=>{settings={...defaults};fill();};
$('manualFields').innerHTML=['rbc','bnc','wise'].map(id=>`<fieldset><legend>${names[id]}</legend><p><a href="${calculators[id]}" target="_blank" rel="noopener">Ouvrir le calculateur / les tarifs officiels ↗</a></p><label for="m-${id}">Taux : CAD pour 1 unité locale<input inputmode="decimal" id="m-${id}" placeholder="Vide : utiliser la source automatique"></label><label for="d-${id}">Date du taux à la source<input type="date" id="d-${id}"></label><label for="t-${id}">Heure à la source (facultative)<input type="time" id="t-${id}"></label><label for="origin-${id}">Provenance déclarée<select id="origin-${id}"><option value="calculator">Calculateur officiel (recopié par moi)</option><option value="personal">Autre source personnelle</option></select></label>${id!=='wise'?`<label for="mode-${id}">Le taux saisi est<select id="mode-${id}"><option value="">Choisir : avec ou sans frais</option><option value="exclusive">Sans frais bancaires</option><option value="inclusive">Frais bancaires inclus</option></select></label><label for="included-${id}">Frais déjà inclus dans ce taux (%)<input inputmode="decimal" id="included-${id}" value="2,5" disabled></label><p class="fine">Le pourcentage inclus est retiré pour retrouver le taux sans frais. Les frais de vos paramètres sont ensuite appliqués une seule fois. L’exemption BNC s’applique sur cette base.</p>`:'<p class="fine">Wise : taux sans frais seulement; préciser les frais CAD du devis ci-dessous ou conserver l’hypothèse configurée.</p>'}</fieldset>`).join('')+'<label>Total CAD du devis carte Wise (facultatif, frais compris)<input inputmode="decimal" id="wiseTotal" placeholder="Ex. 158,07 pour 100 EUR"></label><label>Frais du devis Wise (CAD, facultatif pour cet achat)<input inputmode="decimal" id="wiseFee" placeholder="Vide : frais Wise configurés"></label>';
for(const id of ['rbc','bnc']){$('included-'+id).value=String(settings[id+'FX']).replace('.',',');$('mode-'+id).onchange=()=>{$('included-'+id).disabled=$('mode-'+id).value!=='inclusive';};}
function clearManual(){manual={};document.querySelectorAll('#manualFields input').forEach(el=>{if(!el.id.startsWith('included-'))el.value='';});if(last){last=null;$('results').hidden=true;$('status').textContent='Montant ou devise modifié : appuyez sur Comparer.';}}
$('amount').oninput=clearManual;$('currency').onchange=clearManual;$('category').onchange=()=>{if(last){last.category=$('category').value;render();}};
$('applyManual').onclick=()=>compare(true);$('compareForm').onsubmit=e=>{e.preventDefault();compare(true);};
async function readJSON(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(timer);}}
async function loadRates(currency){
 if(currency==='CAD')return {};
 if(!snapshot){try{snapshot=JSON.parse(localStorage.getItem('carte-claire-snapshot')||'null');}catch{}}
 try{
  const fetched=await readJSON('./rates.json');
  if(!fetched.currencies||![2,3].includes(fetched.schemaVersion))throw Error('Format des taux invalide');
  snapshot=mergeSnapshots(snapshot,fetched);rateLoadError='';
  try{localStorage.setItem('carte-claire-snapshot',JSON.stringify(snapshot));}catch{}
 }catch{
  rateLoadError='Actualisation des références indisponible : dernières données conservées si disponibles. Vérifiez votre connexion puis réessayez Comparer.';
  if(!snapshot){try{snapshot=JSON.parse(localStorage.getItem('carte-claire-snapshot')||'null');}catch{}}
 }
 renderHealth();if(rateLoadError)$('status').textContent+=' '+rateLoadError;
 return ratesFor(snapshot,currency,settings);
}
function renderHealth(){
 if(!last)$('status').textContent='Comparaison automatique estimée : référence de banques centrales, pas les taux officiels des cartes. Les frais Wise sont une hypothèse modifiable. Vous pouvez aussi saisir vos taux manuellement.';
 const notice=$('referenceNotice');if(notice)notice.hidden=!settings.estimates;
 const el=$('collectionStatus');el.replaceChildren();
 const title=document.createElement('p');title.textContent=snapshot?.checkedAt?`Dernière exécution : ${new Date(snapshot.checkedAt).toLocaleString('fr-CA')}. Dates des taux distinctes ci-dessous.`:'Aucun instantané accessible. La saisie manuelle reste disponible.';el.append(title);
 for(const [provider,label] of Object.entries({visa:'Visa',mastercard:'Mastercard',wise:'Wise'})){
  const p=document.createElement('p'),policy=snapshot?.networkPolicy?.[provider];
  const failures=Object.entries(snapshot?.collection||{}).filter(([key,value])=>key.startsWith(provider+':')&&value.state==='failed');
  p.textContent=`${label} : ${failures.length?'échec de collecte; derniers taux conservés.':policy?.status==='enabled'?'collecte autorisée configurée.':(settings.estimates?'comparaison estimée avec la référence automatique; taux officiel non collecté.':'saisie manuelle.')} ${policy?.reason?.replace(/^Saisie manuelle : /,'')||'Aucun accès automatique autorisé configuré.'}`;el.append(p);
 }
}
async function compare(readManual){
 if(busy)return;const amount=number($('amount').value),currency=$('currency').value;
 if(!Number.isFinite(amount)||amount<=0||amount>1e10){$('status').textContent='Entrez un montant positif valide (ex. 125,50).';return;}
 if(readManual){const next={};
 const totalRaw=$('wiseTotal').value.trim();let wiseQuote=null;
 if(totalRaw){const total=number(totalRaw),fee=number($('wiseFee').value);
  if(!$('wiseFee').value.trim()||!Number.isFinite(total)||!Number.isFinite(fee)||fee<0||total<=fee){$('status').textContent='Un total Wise exige des frais CAD explicites (0 accepté), inférieurs au total.';return;}
  $('m-wise').value=String((total-fee)/amount);wiseQuote={amount,currency,totalCad:total,feeCad:fee};
 }
 for(const id of ['rbc','bnc','wise']){const raw=$('m-'+id).value.trim();if(raw){
 const rate=number(raw),date=$('d-'+id).value,time=$('t-'+id).value,mode=id==='wise'?'exclusive':$('mode-'+id).value;
 const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 if(!Number.isFinite(rate)||rate<=0||!date||date>today){$('status').textContent='Un taux manuel exige une valeur positive et une date à la source non future.';$('manual').open=true;return;}
 if(!['exclusive','inclusive'].includes(mode)){$('status').textContent='Pour chaque taux Visa/Mastercard saisi, choisissez explicitement avec ou sans frais.';$('manual').open=true;return;}
 const includedFeePct=mode==='inclusive'?number($('included-'+id).value):0;
 if(mode==='inclusive'&&(!$('included-'+id).value.trim()||!Number.isFinite(includedFeePct)||includedFeePct<0||includedFeePct>100)){$('status').textContent='Précisez les frais déjà inclus dans le taux (0 à 100 %).';return;}
 next[id]={rate,stamp:date+(time?' · '+time+' (heure déclarée à la source)':' · heure non fournie'),rateDate:date,feeMode:mode,includedFeePct,origin:$('origin-'+id).value};
 }}
 const raw=$('wiseFee').value.trim();if(raw){const fee=number(raw);if(!Number.isFinite(fee)||fee<0){$('status').textContent='Les frais Wise doivent être positifs ou nuls.';return;}next.wiseFee=fee;}if(wiseQuote&&next.wise)next.wise.quote=wiseQuote;manual=next;}
 busy=true;const button=$('compareForm').querySelector('button');button.disabled=true;button.textContent='Recherche des taux…';$('status').textContent='Récupération des dernières données accessibles…';
 const rates=await loadRates(currency);last={amount,currency,category:$('category').value,rates,checked:new Date().toLocaleString('fr-CA')};busy=false;button.disabled=false;button.innerHTML='Comparer <span>↗</span>';
 if(number($('amount').value)!==amount||$('currency').value!==currency){last=null;$('status').textContent='Achat modifié : appuyez sur Comparer.';return;}render();
}
function render(){if(!last)return;const {amount,currency,category,rates}=last;const rows=calculate(amount,currency,category,settings,rates,manual),known=rows.filter(x=>x.net!=null),best=known[0],all=known.length===3;
 $('results').hidden=false;$('context').textContent=`${amount.toLocaleString('fr-CA')} ${currency} → CAD`;
 $('summary').textContent=best?(all?`${names[best.id]} : minimum estimé de ${money(best.net)}. Économie estimée de ${money(known[known.length-1].net-best.net)} par rapport à la plus chère.`:`Comparaison partielle : ${names[best.id]} est la moins chère des ${known.length} cartes chiffrables. Aucun gagnant global tant que les données manquent.`):'Comparaison impossible : renseignez les taux et les frais manquants.';
 $('rows').replaceChildren(...rows.map((r,i)=>{const tr=document.createElement('tr');if(i===0&&best)tr.className='win';const cell=(text,cls)=>{const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;tr.append(td);return td;};const first=cell((r.net!=null?`${i+1}. `:'— ')+names[r.id]);const note=document.createElement('small');note.textContent=r.data?`${r.data.label}${r.simulation?' · EXEMPTION SIMULÉE':''} · ${r.data.stamp}`:r.reason;first.append(note);if(r.data){const details=document.createElement('small');details.textContent=`${r.data.quote?'Base reconstituée du devis arrondi':r.data.estimated?'Taux de référence estimé':r.data.precision?'Taux calculé depuis le total officiel':'Taux saisi/source'} : ${r.data.rate.toLocaleString('fr-CA',{maximumFractionDigits:10})} CAD/unité · ${r.data.feeMode==='inclusive'?`inclut ${r.data.includedFeePct} %; base hors frais ${r.baseRate?.toLocaleString('fr-CA',{maximumFractionDigits:10})}`:'sans frais bancaires'}`;first.append(details);if(r.data.source){const link=document.createElement('a');link.href=r.data.source;link.target='_blank';link.rel='noopener';link.textContent='Source ↗';first.append(link);}}cell(money(r.base));const fc=cell(money(r.fee));if(r.id==='wise'&&r.fee!=null&&currency!=='CAD'){const fn=document.createElement('small');fn.textContent=manual.wiseFee!=null?'Frais saisis manuellement · cet achat':r.data?.quote?'Frais déjà compris dans le devis officiel · cet achat':`${settings.wiseFX} % · HYPOTHÈSE, pas des frais officiels`;fc.append(fn);}if(r.id!=='wise'&&r.data?.feeMode==='inclusive'){const fn=document.createElement('small');fn.textContent=`${r.appliedFeePct} % appliqués une seule fois sur la base hors frais`;fc.append(fn);}cell(money(r.gross));cell(money(r.reward));cell(money(r.float));cell(money(r.net),'net');cell(r.net!=null?money(r.net-best.net):r.reason);return tr;}));
 const stale=rows.some(r=>r.data?.stale),estimated=rows.some(r=>r.data?.estimated);
 if(stale||estimated||rows.some(r=>r.data?.feeHypothesis)||rows.some(r=>r.id==='wise'&&r.net!=null&&!r.data?.quote&&manual.wiseFee==null&&currency!=='CAD'))$('summary').textContent+=' Simulation : présence de données anciennes, estimées ou de frais Wise hypothétiques; vérifiez les mentions sous chaque carte.';
 $('status').textContent=`Consultation : ${last.checked}. ${currency==='CAD'?'Aucune conversion.':'Les données officielles conservées ne sont jamais remplacées par une estimation. Les taux de référence sont indiqués ESTIMÉS avec leur date; ils ne sont pas les taux officiels des cartes. Les données périmées restent exclues sauf choix explicite dans Paramètres.'}${rateLoadError?' '+rateLoadError:''}${storageOK?'':' Stockage local indisponible.'}`;
 $('sources').textContent='OFFICIEL : résultat validé conservé, avec sa date. MANUEL : saisie personnelle non vérifiée. ESTIMÉ : référence distincte, jamais un taux Visa/Mastercard. Un devis Wise ne vaut que pour son montant; ses frais sont déjà inclus. Les taux périmés restent conservés mais sont exclus du calcul par défaut. Référence de banques centrales : validité maximale de 7 jours pour couvrir fins de semaine et jours fériés, date réelle toujours affichée.';

}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

loadRates($('currency').value).catch(()=>{});
