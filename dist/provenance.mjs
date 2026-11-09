export const calculators={rbc:'https://www.visa.ca/en_CA/support/consumer/travel-support/exchange-rate-calculator.html',bnc:'https://www.mastercard.com/ca/en/personal/get-support/currency-exchange-rate-converter.html',wise:'https://wise.com/ca/pricing/card-fees'};
export function referenceRate(record){
 if(!record||!Number.isFinite(record.rate)||record.rate<=0||!record.stamp)return null;
 return {...record,status:'estimated',estimated:true,sourceName:'Frankfurter · référence de banques centrales',label:'ESTIMÉ · référence Frankfurter, pas un taux officiel Visa/Mastercard/Wise',source:record.source||'https://frankfurter.dev/',feeMode:'exclusive'};
}
export function wiseRate(record){
 if(!record||!Number.isFinite(record.rate)||record.rate<=0||!record.stamp)return null;
 return {...record,status:'official',estimated:false,sourceName:'Wise · taux indicatif public',label:'OFFICIEL · Wise, indicatif (frais séparés)',feeMode:'exclusive'};
}
export function manualRate(id,record){
 if(!record||!Number.isFinite(record.rate)||record.rate<=0)throw Error('Taux manuel invalide.');
 const feeMode=record.feeMode||'exclusive';
 if(!['exclusive','inclusive'].includes(feeMode))throw Error('Précisez si le taux comprend les frais.');
 if(feeMode==='inclusive'&&(!Number.isFinite(record.includedFeePct)||record.includedFeePct<0||record.includedFeePct>100))throw Error('Pourcentage inclus invalide.');
 if(id==='wise'&&feeMode==='inclusive')throw Error('Wise : saisir le taux sans frais et les frais du devis séparément.');
 const declared=record.origin==='calculator';
 const network={rbc:'Visa',bnc:'Mastercard',wise:'Wise'}[id];
 return {...record,status:'manual',estimated:false,feeMode,label:`MANUEL · ${declared?'calculateur officiel '+network+' déclaré (non vérifié)':'source personnelle non vérifiée'}`,sourceName:declared?'Calculateur officiel '+network+' (saisie utilisateur)':'Saisie utilisateur',source:declared?calculators[id]:null};
}
