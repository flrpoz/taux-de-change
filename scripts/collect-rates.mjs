import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {isAuthorized} from './rates-core.mjs';
const config=JSON.parse(await readFile('config/sources.json','utf8'));
const observations=[],attempts=[];
await mkdir('artifacts',{recursive:true});
for(const [provider,policy] of Object.entries(config.providers)){
 if(!isAuthorized(policy)){attempts.push({provider,state:'manual',reason:policy.reason});continue;}
 for(const currency of config.currencies){
  const args=['scripts/collectors/collect_ui.py',provider,'--currency',currency,'--amount',currency==='IDR'?'1000000':'100','--chromium-sandbox'];
  const env={...process.env};for(const key of Object.keys(env))if(/TOKEN|SECRET|API_KEY|PASSWORD/i.test(key))delete env[key];
  const result=spawnSync(process.env.PYTHON||'python',args,{encoding:'utf8',timeout:90000,env,stdio:['ignore','pipe','pipe']});
  await writeFile(`artifacts/${provider}-${currency}.log`,result.stdout||'');
  let data;try{data=JSON.parse(result.stdout.trim().split('\n').at(-1));}catch{}
  if(result.status===0&&data?.status==='validated'&&!data.testOnly)observations.push(data);
  attempts.push({provider,currency,state:data?.status||'failed',reason:result.error?.message||data?.error||null});
 }
}
await writeFile('artifacts/observations.json',JSON.stringify(observations,null,2)+'\n');
await writeFile('artifacts/collection-log.json',JSON.stringify({at:new Date().toISOString(),attempts},null,2)+'\n');
console.log(`${observations.length} observations officielles candidates. ${attempts.filter(x=>x.state==='manual').length} fournisseurs en mode manuel.`);
