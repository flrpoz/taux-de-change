import {validateRecord,mergeDaily,RATE_FIELDS} from './history-core.mjs';
let database;
export function openHistory(){
 if(database)return database;
 database=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('IndexedDB est indisponible. L’historique ne peut pas être enregistré dans ce navigateur.'));return;}
  const request=indexedDB.open('carte-claire-history',1);
  request.onupgradeneeded=()=>{const db=request.result;const rows=db.createObjectStore('comparisons',{keyPath:['date','user']});for(const field of ['date','user','currency'])rows.createIndex(field,field);db.createObjectStore('users',{keyPath:'id'});};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
  request.onerror=()=>{database=null;reject(request.error);};
  request.onblocked=()=>reject(Error('Fermez les autres onglets Carte Claire pour ouvrir l’historique.'));
 });return database;
}
async function transaction(mode,action){
 const db=await openHistory();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['comparisons','users'],mode);let result,error;
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('Enregistrement annulé.'));tx.onerror=()=>{};
  const fail=e=>{error=e;tx.abort();};
  try{action(tx.objectStore('comparisons'),tx.objectStore('users'),v=>{result=v;},fail);}catch(e){fail(e);}
 });
}
export const listHistory=()=>transaction('readonly',(s,u,done)=>{s.getAll().onsuccess=e=>done(e.target.result);});
export const getDay=(date,user)=>transaction('readonly',(s,u,done)=>{s.get([date,user.trim().normalize('NFC')]).onsuccess=e=>done(e.target.result);});
export const listUsers=()=>transaction('readonly',(s,u,done)=>{u.getAll().onsuccess=e=>done(e.target.result.map(v=>v.id).sort());});
export function saveDay(draft,{replace=false,expectedRevision}={}){
 const clean=validateRecord(draft);
 return transaction('readwrite',(s,u,done,fail)=>{s.get([clean.date,clean.user]).onsuccess=e=>{
  try{const old=e.target.result;if(old&&(!replace||old.revision!==expectedRevision))throw Error('Cette journée a déjà été enregistrée ou modifiée. Relisez la ligne avant de la remplacer.');
   const next=mergeDaily(old,clean);s.put(next);u.put({id:next.user});done(next);
  }catch(err){fail(err);}
 };});
}
export function editDay(original,draft,{confirmCurrency=false}={}){
 const clean=validateRecord(draft);
 return transaction('readwrite',(s,u,done,fail)=>{s.get([original.date,original.user]).onsuccess=e=>{
  const old=e.target.result;
  if(!old||old.revision!==original.revision){fail(Error('Cette ligne a été modifiée dans un autre onglet. Rechargez l’historique.'));return;}
  if(clean.currency!==old.currency&&!confirmCurrency){fail(Error('Confirmez que les taux correspondent à la nouvelle devise.'));return;}
  const keyChanged=old.date!==clean.date||old.user!==clean.user;
  const write=()=>{const now=new Date().toISOString(),sources={...(old.metadata?.sources||{})};for(const f of RATE_FIELDS)if(clean.currency!==old.currency||clean[f]!==old[f])sources[f]={label:'Modifié manuellement dans l’historique',editedAt:now};const next={...clean,metadata:{...old.metadata,sources},createdAt:old.createdAt,updatedAt:now,revision:old.revision+1};if(keyChanged)s.delete([old.date,old.user]);s.put(next);u.put({id:next.user});done(next);};
  if(keyChanged)s.get([clean.date,clean.user]).onsuccess=dest=>{if(dest.target.result)fail(Error('Une ligne existe déjà pour cette date et cet usager.'));else write();};else write();
 };});
}
export function deleteDay(record){return transaction('readwrite',(s,u,done,fail)=>{s.get([record.date,record.user]).onsuccess=e=>{const old=e.target.result;if(!old||old.revision!==record.revision){fail(Error('Cette ligne a changé. Rechargez l’historique.'));return;}s.delete([record.date,record.user]);done(true);};});}
