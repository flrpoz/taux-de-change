const fs=require('node:fs');
const branch='carte-claire-data';
module.exports.restore=async({github,context,core})=>{
 try{
  const r=await github.rest.repos.getContent({...context.repo,path:'rates.json',ref:branch});
  const snapshot=JSON.parse(Buffer.from(r.data.content,'base64').toString());
  if(!snapshot.currencies||snapshot.schemaVersion!==3)throw Error('Instantané persistant invalide');
  fs.writeFileSync('dist/rates.json',JSON.stringify(snapshot,null,2)+'\n');
  core.info('Dernier instantané persistant restauré.');
 }catch(e){if(e.status!==404)throw e;core.info('Premier lancement : instantané du dépôt utilisé.');}
};
module.exports.persist=async({github,context,core})=>{
 const snapshot=JSON.parse(fs.readFileSync('dist/rates.json','utf8'));
 if(snapshot.schemaVersion!==3||!snapshot.currencies)throw Error('Instantané invalide : écriture refusée');
 try{await github.rest.git.getRef({...context.repo,ref:'heads/'+branch});}
 catch(e){if(e.status!==404)throw e;const r=await github.rest.git.getRef({...context.repo,ref:'heads/'+context.payload.repository.default_branch});await github.rest.git.createRef({...context.repo,ref:'refs/heads/'+branch,sha:r.data.object.sha});}
 let sha;
 try{sha=(await github.rest.repos.getContent({...context.repo,path:'rates.json',ref:branch})).data.sha;}catch(e){if(e.status!==404)throw e;}
 await github.rest.repos.createOrUpdateFileContents({...context.repo,path:'rates.json',branch,message:'Actualiser les taux et statuts de collecte [skip ci]',content:Buffer.from(JSON.stringify(snapshot,null,2)+'\n').toString('base64'),...(sha?{sha}:{})});
 const failures=Object.entries(snapshot.collection||{}).filter(([,r])=>r.state==='failed'&&r.consecutiveFailures>=2);
 if(failures.length){
  const title='Carte Claire : échecs répétés de collecte';
  const issues=await github.rest.issues.listForRepo({...context.repo,state:'open',creator:'github-actions[bot]',per_page:100});
  const issue=issues.data.find(i=>i.title===title&&!i.pull_request);
  const body='Les derniers taux sont conservés avec leurs dates.\n\n'+failures.map(([key,r])=>`- ${key} : ${r.consecutiveFailures} échecs; ${r.reason}`).join('\n')+`\n\n[Journal du workflow](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`;
  if(issue)await github.rest.issues.update({...context.repo,issue_number:issue.number,body});
  else await github.rest.issues.create({...context.repo,title,body});
  core.warning('Échecs répétés : issue de suivi créée ou mise à jour. Activer les notifications GitHub pour ce dépôt.');
 }
};
