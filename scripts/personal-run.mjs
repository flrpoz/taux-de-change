import {readFile,mkdir,writeFile,rename,open,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {personalAllowed} from './personal-policy.mjs';
import {mergeOfficial} from './rates-core.mjs';
export const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export function privateDirectory(env=process.env){
 const dir=path.resolve(env.CARTE_CLAIRE_PRIVATE_DIR||path.join(os.homedir(),'.carte-claire-personnel'));
 if(dir===root||dir.startsWith(root+path.sep)||root.startsWith(dir+path.sep))throw Error('Les données privées doivent être hors du dépôt.');
 return dir;
}
export async function runPersonal({currency,amount,env=process.env}={}){
 if(env.GITHUB_ACTIONS==='true')throw Error('Collecte privée interdite dans GitHub Actions public.');
 const config=JSON.parse(await readFile(path.join(root,'config/personal-sources.json'),'utf8'));
 config.requireWiseCardContext=true;
 if(currency&&!config.currencies.includes(currency))throw Error('Devise non configurée');
 if(amount!=null&&(!Number.isFinite(Number(amount))||Number(amount)<=0||Number(amount)>1e9))throw Error('Montant invalide');
 const dir=privateDirectory(env);await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
 const lockPath=path.join(dir,'collection.lock');let lock;
 try{lock=await open(lockPath,'wx',0o600);}catch{throw Error('Une collecte est déjà en cours. Si le processus a été interrompu, supprimer collection.lock après vérification.');}
 try{
 let previous;try{previous=JSON.parse(await readFile(path.join(dir,'rates.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;previous={schemaVersion:3,currencies:{}};}
 const selected=currency?[currency]:config.currencies;
 const observations=[],attempts=[];
 const runDir=path.join(dir,'runs',new Date().toISOString().replaceAll(':','-'));await mkdir(runDir,{recursive:true,mode:0o700});
 for(const [provider,policy] of Object.entries(config.providers)){
  if(!personalAllowed(config,provider)){attempts.push({provider,state:'blocked',reason:policy.reason});continue;}
  for(const code of selected){
   const n=String(amount??(code==='IDR'?1000000:code==='JPY'?10000:100));
   const childEnv={...env};for(const k of Object.keys(childEnv))if(/TOKEN|SECRET|API_KEY|PASSWORD/i.test(k))delete childEnv[k];
   const result=spawnSync(env.PYTHON||'python3',[path.join(root,'scripts/collectors/collect_ui.py'),provider,'--currency',code,'--amount',n,'--private-review','--chromium-sandbox','--output-dir',runDir],{cwd:root,env:childEnv,encoding:'utf8',timeout:85000,stdio:['ignore','pipe','pipe']});
   let data;try{data=JSON.parse((result.stdout||'').trim().split('\n').at(-1));}catch{}
   if(result.status===0&&data?.status==='validated'&&!data.testOnly)observations.push(data);
   const entry={provider,currency:code,status:data?.status||'failed',reason:result.error?.message||data?.error||result.stderr?.slice(-1000)||null};attempts.push(entry);
   // Full output and proof paths stay private; do not print exchange amounts to CI.
   await writeFile(path.join(runDir,`${provider}-${code}.log`),(result.stdout||'')+'\n'+(result.stderr||''),{mode:0o600});
  }
 }
 const effectiveConfig={...config,currencies:selected};
 const next=mergeOfficial(previous,observations,effectiveConfig,Date.now(),{personal:true});
 next.scope='personal-private';next.collectionCurrencies=config.currencies;
 const report={at:new Date().toISOString(),scope:'personal-private',attempts,validated:observations.length,errors:next.errors,openaiApiCalls:0};
 await writeFile(path.join(runDir,'observations.json'),JSON.stringify(observations,null,2),{mode:0o600});
 await writeFile(path.join(runDir,'report.json'),JSON.stringify(report,null,2),{mode:0o600});
 const temporary=path.join(dir,'rates.tmp');await writeFile(temporary,JSON.stringify(next,null,2)+'\n',{mode:0o600});await rename(temporary,path.join(dir,'rates.json'));
 await writeFile(path.join(dir,'last-run.json'),JSON.stringify(report,null,2),{mode:0o600});
 if(process.platform==='darwin'&&Object.values(next.collection).some(x=>x.consecutiveFailures>=2))spawnSync('osascript',['-e','display notification "Échecs répétés : derniers taux datés conservés." with title "Carte Claire privée"'],{stdio:'ignore'});
 return report;
 }finally{await lock.close();const {unlink}=await import('node:fs/promises');await unlink(lockPath);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
 try{const r=await runPersonal({currency:value('--currency'),amount:value('--amount')});console.log(JSON.stringify({validated:r.validated,failed:r.errors.length,blocked:r.attempts.filter(x=>x.state==='blocked').length,private:true}));if(r.errors.length)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
}
