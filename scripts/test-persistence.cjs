const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {restore,persist}=require('./github-data.cjs');
const cwd=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'carte-claire-persist-'));
const context={repo:{owner:'test-owner',repo:'test-repo'},payload:{repository:{default_branch:'main'}},runId:123};
const core={info(){},warning(){}};
const snapshot={schemaVersion:3,currencies:{EUR:{visa:{rate:2,stamp:'2026-11-08',status:'official'}}},collection:{'visa:EUR':{state:'failed',consecutiveFailures:2,reason:'test de panne'}}};
const error=status=>Object.assign(Error('HTTP '+status),{status});
let branchExists=false,stored=null,writes=0,alerts=0;
const github={rest:{
 repos:{
  async getContent(){if(!stored)throw error(404);return {data:{sha:'current-file-sha',content:Buffer.from(stored).toString('base64')}};},
  async createOrUpdateFileContents(input){assert.equal(input.branch,'carte-claire-data');if(stored)assert.equal(input.sha,'current-file-sha');stored=Buffer.from(input.content,'base64').toString();writes++;return {data:{}};}
 },
 git:{async getRef(input){if(input.ref==='heads/carte-claire-data'&&!branchExists)throw error(404);return {data:{object:{sha:'base-commit'}}};},async createRef(input){assert.equal(input.ref,'refs/heads/carte-claire-data');assert.equal(input.sha,'base-commit');branchExists=true;}},
 issues:{async listForRepo(){return {data:[]};},async create(input){assert.match(input.body,/2 échecs/);assert.match(input.body,/actions\/runs\/123/);alerts++;return {data:{}};},async update(){throw Error('inattendu');}}
}};
(async()=>{
 try{
  process.chdir(dir);fs.mkdirSync('dist');fs.writeFileSync('dist/rates.json',JSON.stringify(snapshot));
  await persist({github,context,core});assert.equal(writes,1);assert.equal(alerts,1);assert.deepEqual(JSON.parse(stored),snapshot);
  fs.writeFileSync('dist/rates.json','{}');await restore({github,context,core});assert.deepEqual(JSON.parse(fs.readFileSync('dist/rates.json')),snapshot);
  await persist({github,context,core});assert.equal(writes,2);
  const before=fs.readFileSync('dist/rates.json','utf8');
  await assert.rejects(()=>restore({github:{rest:{repos:{getContent:async()=>{throw error(403);}}}},context,core}),/HTTP 403/);
  assert.equal(fs.readFileSync('dist/rates.json','utf8'),before,'Une erreur d’autorisation ne doit pas être assimilée au premier lancement');
  fs.writeFileSync('dist/rates.json','{}');await assert.rejects(()=>persist({github,context,core}),/invalide/);assert.equal(writes,2);
  console.log('Persistance : contrat API GitHub simulé, branche de données séparée, restauration, mise à jour avec SHA, alerte répétée, refus sur erreur 403 et JSON invalide. Aucun appel GitHub réel.');
 }finally{process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
