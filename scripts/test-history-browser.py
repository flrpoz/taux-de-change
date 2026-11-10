"""Historique IndexedDB et UI : uniquement des données locales synthétiques."""
import csv,io,json,os,threading
from pathlib import Path
from datetime import datetime,timezone
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/history-tests';OUT.mkdir(parents=True,exist_ok=True)
day=datetime.now(timezone.utc).strftime('%Y-%m-%d')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'dist'),**kw)
 def do_GET(self):
  if self.path=='/rates.json':
   data=json.dumps({'schemaVersion':3,'checkedAt':datetime.now(timezone.utc).isoformat(),'testOnly':True,'currencies':{c:{'reference':{'rate':1.5,'stamp':day,'source':'https://api.frankfurter.dev/'}} for c in ['EUR','USD','JPY']}}).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
  else:super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
with sync_playwright() as p:
 opts={'headless':True,'chromium_sandbox':True}
 if os.environ.get('CARTE_CLAIRE_CHROMIUM'):opts['executable_path']=os.environ['CARTE_CLAIRE_CHROMIUM']
 elif Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**opts);context=browser.new_context(accept_downloads=True,service_workers='block');external=[];errors=[]
 def route(r):
  if r.request.url.startswith(origin+'/'):r.continue_()
  else:external.append(r.request.url);r.abort()
 context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 def records():return page.evaluate("async()=>{const m=await import('./history-db.mjs');return m.listHistory()}")
 def compare():page.locator('#compareForm button').click();expect(page.locator('#summary')).to_contain_text('minimum estimé')
 def save(user):page.locator('#historyUser').fill(user);page.locator('#saveHistory').click()
 def to_history():page.goto(origin+'/history.html');expect(page.locator('#historyCount')).to_contain_text('ligne')
 try:
  page.goto(origin);compare();date=page.locator('#historyDay').inner_text();page.locator('#manual > summary').click()
  exact='0.63500000000000000001';real='0.625123456789012345678901'
  page.locator('#m-rbc').fill(exact);page.locator('#applyManual').click();expect(page.locator('#historyPreview')).to_contain_text(exact)
  save('Alice');expect(page.locator('#historyStatus')).to_contain_text('Taux enregistrés pour Alice');assert len(records())==1
  assert records()[0]['officialVisa']==exact and records()[0]['realVisa']==''
  save('Alice');expect(page.locator('#replaceHistory')).to_be_visible();page.locator('#replaceHistoryNo').click();expect(page.locator('#historyStatus')).to_contain_text('annulé');assert len(records())==1
  to_history();expect(page.locator('.historyGroups th')).to_have_text(['Informations','Taux estimés','Taux officiels','Taux réels']);assert page.locator('thead tr').nth(1).locator('th').count()==12
  row=page.locator('#historyRows tr').filter(has_text='Alice');row.get_by_role('button',name='Modifier',exact=True).click();page.locator('#edit-realMastercard').fill(real);page.locator('#edit-realVisa').fill('0,63');page.locator('#editHistoryForm button[type=submit]').click();expect(page.locator('#historyStatus')).to_have_text('Ligne modifiée.');page.reload();expect(page.locator('#historyRows')).to_contain_text(real)
  page.goto(origin);compare();page.locator('#manual > summary').click();page.locator('#m-rbc').fill('0.64');page.locator('#applyManual').click();expect(page.locator('#historyPreview')).to_contain_text('0.64')
  save('Alice');page.locator('#replaceHistoryYes').click();expect(page.locator('#historyStatus')).to_contain_text('Taux enregistrés pour Alice');assert records()[0]['realMastercard']==real;assert records()[0]['officialVisa']=='0.64'
  save('Bob');expect(page.locator('#historyStatus')).to_contain_text('Taux enregistrés pour Bob');assert len(records())==2
  page.locator('#currency').select_option('USD');compare();save('Alice');page.locator('#replaceHistoryYes').click();expect(page.locator('#historyStatus')).to_contain_text('autre devise');alice=next(r for r in records() if r['user']=='Alice');assert alice['currency']=='EUR' and alice['realMastercard']==real
  to_history();page.locator('#filterUser').select_option('Alice');page.locator('#filterCurrency').select_option('EUR');page.locator('#filterFrom').fill(date);page.locator('#filterFrom').dispatch_event('change');page.locator('#filterTo').fill(date);page.locator('#filterTo').dispatch_event('change');expect(page.locator('#historyRows tr')).to_have_count(1)
  with page.expect_download() as info:page.locator('#exportHistory').click()
  download=info.value;download.save_as(str(OUT/'export-synthetique.csv'));rows=list(csv.reader(io.StringIO(Path(download.path()).read_text(encoding='utf-8-sig'))))
  assert len(rows)==2 and all(len(r)==12 for r in rows);assert rows[0]==['Date','Usager','Devise','Taux estimé — Mastercard','Taux estimé — Visa','Taux estimé — Wise','Taux officiel — Mastercard','Taux officiel — Visa','Taux officiel — Wise','Taux réel — Mastercard','Taux réel — Visa','Taux réel — Wise'];assert rows[1][7]=='0.64' and rows[1][9]==real and rows[1][10]=='0.63' and rows[1][11]==''
  page.locator('#filterCurrency').select_option('USD');expect(page.locator('#historyRows tr')).to_have_count(0);page.get_by_role('button',name='Effacer les filtres').click();expect(page.locator('#historyRows tr')).to_have_count(2)
  bob=page.locator('#historyRows tr').filter(has_text='Bob');bob.get_by_role('button',name='Modifier',exact=True).click();page.locator('#editUser').fill('Alice');page.locator('#editHistoryForm button[type=submit]').click();expect(page.locator('#editHistoryStatus')).to_contain_text('existe déjà');assert len(records())==2;page.locator('#closeEditHistory').click()
  bob.get_by_role('button',name='Modifier',exact=True).click();page.locator('#editCurrency').fill('JPY');page.locator('#editHistoryForm button[type=submit]').click();expect(page.locator('#editHistoryStatus')).to_contain_text('Confirmez');page.locator('#confirmCurrencyChange').check();page.locator('#editHistoryForm button[type=submit]').click();expect(page.locator('#historyStatus')).to_have_text('Ligne modifiée.');assert next(r for r in records() if r['user']=='Bob')['currency']=='JPY'
  bob=page.locator('#historyRows tr').filter(has_text='Bob');bob.get_by_role('button',name='Supprimer',exact=True).click();page.locator('#cancelDeleteHistory').click();assert len(records())==2
  bob.get_by_role('button',name='Supprimer',exact=True).click();page.locator('#confirmDeleteHistory').click();expect(page.locator('#historyStatus')).to_have_text('Ligne supprimée.');assert len(records())==1
  # Concurrence : le formulaire ouvert ne doit pas écraser une modification récente.
  page.locator('#historyRows tr').get_by_role('button',name='Modifier',exact=True).click()
  page.evaluate("async()=>{const m=await import('./history-db.mjs');const row=(await m.listHistory())[0];await m.editDay(row,{...row,realWise:'0.5'})}")
  page.locator('#edit-realWise').fill('0.7');page.locator('#editHistoryForm button[type=submit]').click();expect(page.locator('#editHistoryStatus')).to_contain_text('autre onglet');assert records()[0]['realWise']=='0.5';page.locator('#closeEditHistory').click();page.reload();expect(page.locator('#historyRows')).to_contain_text('0.5')
  page.set_viewport_size({'width':390,'height':844});assert page.locator('.historyTable').evaluate('(e)=>e.scrollWidth>e.clientWidth');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/'historique-mobile.png'),full_page=True)
  # Un autre profil/appareil ne reçoit pas les données du premier.
  separate=browser.new_context(service_workers='block');other=separate.new_page();other.goto(origin+'/history.html');expect(other.locator('#historyCount')).to_have_text('0 ligne');separate.close()
  blocked=browser.new_context(service_workers='block');blocked.add_init_script("Object.defineProperty(window,'indexedDB',{value:undefined});");broken=blocked.new_page();broken.goto(origin+'/history.html');expect(broken.locator('#historyStatus')).to_contain_text('indisponible');blocked.close()
  assert not errors,errors;assert not external,external
  print('Historique navigateur : IndexedDB réel, sauvegarde unique/jour/usager, taux réels conservés, devise protégée, deux usagers, édition/suppression, concurrence, précision CSV 12 colonnes, filtres, iPhone et isolation des profils. 0 fournisseur financier contacté.')
 finally:browser.close();server.shutdown()
