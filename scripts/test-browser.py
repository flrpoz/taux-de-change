"""Tests locaux seulement : aucune requête vers un fournisseur financier."""
import json, os, subprocess, sys, threading
from pathlib import Path
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/browser-tests';OUT.mkdir(parents=True,exist_ok=True)
today=datetime.now(timezone.utc)
day=today.strftime('%Y-%m-%d');mdy=f'{today.month}/{today.day}/{today.year}'
names={'EUR':'EURO','USD':'UNITED STATES DOLLAR','CAD':'CANADIAN DOLLAR','IDR':'INDONESIAN RUPIAH','AUD':'AUSTRALIAN DOLLAR','JPY':'JAPANESE YEN'}

def fixture(provider):
    # Valeurs volontairement synthétiques (2 CAD/unité) : jamais des taux officiels.
    if provider=='mastercard':
        fields=''
        for field in ['selectPlaceholder1Input','selectPlaceholder2Input']:
            options=''.join(f'<span class="made-c-overflow-menu__link" data-code="{c}" style="display:none">{n} - {c}</span>' for c,n in names.items())
            fields+=f'<section><input id="{field}">{options}</section>'
        html=f'''<button id="onetrust-reject-all-handler">Reject all</button>{fields}
<input id="amountInput"><input id="bankFeeInput" onblur="this.value=parseFloat(this.value)+'%'">
<forms-ui-date-picker max-date="{mdy}"><input placeholder="DD MM YYYY" readonly>
<forms-ui-date-grid><span role="cell" class="date" data-index="{mdy}" aria-label="date test">{today.day}</span></forms-ui-date-grid></forms-ui-date-picker>
<button aria-label="Calculate" id="calculate">Calculate</button><div id="result"></div>
<script>
document.querySelectorAll('section').forEach(s=>{{let f=s.querySelector('input');let opts=[...s.querySelectorAll('span')];
 f.oninput=()=>opts.forEach(o=>o.style.display=o.dataset.code===f.value?'inline':'none');
 opts.forEach(o=>o.onclick=()=>{{f.value=o.textContent;f.dataset.code=o.dataset.code;opts.forEach(x=>x.style.display='none')}})}});
document.querySelector('span[role=cell]').onclick=()=>document.querySelector('input[placeholder]').value='{today.strftime('%d %b %Y')}';
document.querySelector('#calculate').onclick=()=>{{let c=document.querySelector('#selectPlaceholder1Input').dataset.code;let n={json.dumps(names)}[c];let a=Number(document.querySelector('#amountInput').value);document.querySelector('#result').innerHTML='<p>Current Rate :</p><p>1 '+n+' ('+c+') = 2.0000000 CANADIAN DOLLAR (CAD)</p><p>Transaction Amount :</p><p>'+a.toFixed(2)+' '+c+' = '+(a*2).toFixed(2)+' CAD</p><p>as of {today.strftime('%B %d %Y')} and includes a bank fee of %.</p>'}};
</script>'''
    elif provider=='visa':
        html=f'''<button>Reject all</button><input id="input_amount_paid"><input id="autosuggestinput_from"><input id="autosuggestinput_to">
<button aria-label="edit date and bank rate">Edit</button><input id="input_bank_rate" value="2"><input id="dateinput_date" value="{mdy}">
<button id="calculate">Calculate Conversion</button><div id="result"></div>
<script>document.querySelector('#calculate').onclick=()=>{{let a=Number(document.querySelector('#input_amount_paid').value),c=document.querySelector('#autosuggestinput_from').value;document.querySelector('#result').innerHTML='<p>'+a+' '+c+' = '+(2*a).toFixed(6)+' CAD</p><p>1 '+c+' = 2.000000 CAD</p>'}};</script>'''
    else:
        options=''.join(f'<button role="option" data-code="{c}">{c} {n}</button>' for c,n in names.items() if c!='CAD')
        html=f'''<p>For residents in Canada — TEST LOCAL</p><input id="SOURCE-input" value="1000"><button id="SOURCE-inputSelectedCurrency">CAD</button>
<input id="TARGET-input" value="500"><button id="TARGET-inputSelectedCurrency">USD</button><input id="TARGET-inputSelectedCurrencySearch">{options}
<p>Fixed fee</p><p>0 CAD</p><p>Variable fee</p><p>1 CAD</p><p>Total included fees</p><p>1 CAD</p>
<script>document.querySelectorAll('[role=option]').forEach(b=>b.onclick=()=>document.querySelector('#TARGET-inputSelectedCurrency').textContent=b.dataset.code);document.querySelector('#TARGET-input').oninput=e=>document.querySelector('#SOURCE-input').value=(2*Number(e.target.value)+1).toFixed(2);</script>'''
    return ('<!doctype html><html><head><title>TEST LOCAL '+provider+'</title></head><body><h1>TEST LOCAL — données synthétiques</h1>'+html+'</body></html>').encode()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'dist'),**kw)
    def do_GET(self):
        if self.path=='/rates.json':
            snapshot={'schemaVersion':3,'testOnly':True,'checkedAt':today.isoformat(),'currencies':{c:{'reference':{'rate':2,'stamp':day,'status':'estimated','source':'https://api.frankfurter.dev/'},'wise':{'rate':1,'stamp':'2020-01-01','status':'official'}} for c in names if c!='CAD'}}
            data=json.dumps(snapshot).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data);return
        if self.path.startswith('/fixture/'):
            b=fixture(self.path.rsplit('/',1)[-1]);self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(b)
        else:super().do_GET()
    def log_message(self,*a):pass

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
results=[]
try:
    for provider in ([] if '--app-only' in sys.argv else ['mastercard','visa','wise']):
        for currency in ['EUR','USD','IDR','AUD','JPY']:
            cmd=[sys.executable,str(ROOT/'scripts/collectors/collect_ui.py'),provider,'--currency',currency,'--fixture-url',origin+'/fixture/'+provider,'--output-dir',str(OUT/'collectors'),'--chromium-sandbox']
            run=subprocess.run(cmd,cwd=ROOT,stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=90)
            (OUT/f'{provider}-{currency}.log').write_text(run.stdout+run.stderr)
            assert run.returncode==0,(provider,currency,run.stdout[-4000:],run.stderr)
            result=json.loads(run.stdout.strip().splitlines()[-1]);assert result['status']=='test-validated' and result['testOnly'] is True
            results.append({'provider':provider,'currency':currency,'testOnly':True,'status':result['status']})
            print('TEST LOCAL collecteur',provider,currency,'OK',flush=True)
    with sync_playwright() as p:
        opts={'headless':True,'chromium_sandbox':True}
        if os.environ.get('CARTE_CLAIRE_CHROMIUM'):opts['executable_path']=os.environ['CARTE_CLAIRE_CHROMIUM']
        elif Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
        b=p.chromium.launch(**opts)
        context=b.new_context(viewport={'width':1280,'height':1000},service_workers='block')
        external=[]
        def route(r):
            if r.request.url.startswith(origin+'/'):r.continue_()
            else:external.append(r.request.url);r.abort()
        context.route('**/*',route)
        context.add_init_script("if(!localStorage.getItem('carte-claire-v4'))localStorage.setItem('carte-claire-v3',JSON.stringify({estimates:false,rbcFX:3.1}));")
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin);expect(page.locator('#wiseTotal')).to_have_count(1)
        page.locator('#settingsButton').click();expect(page.locator('#estimates')).to_be_checked();expect(page.locator('#allowStale')).not_to_be_checked();expect(page.locator('#s-rbcFX')).to_have_value('3.1');page.locator('#closeSettings').click()
        page.locator('#compareForm button').click();expect(page.locator('#summary')).to_contain_text('minimum estimé')
        assert all('ESTIMÉ' in tr.inner_text() for tr in page.locator('#rows tr').all())
        page.locator('#settingsButton').click();page.locator('#estimates').uncheck();page.locator('#settingsForm button[type=submit]').click()
        page.reload();page.locator('#settingsButton').click();expect(page.locator('#estimates')).not_to_be_checked();page.locator('#closeSettings').click()
        page.locator('#compareForm button').click();expect(page.locator('#summary')).to_contain_text('Comparaison impossible')
        page.locator('#settingsButton').click();page.locator('#estimates').check();page.locator('#settingsForm button[type=submit]').click()
        page.screenshot(path=str(OUT/'revision-desktop.png'),full_page=True)
        expect(page.locator('thead th').nth(0)).to_have_text('Coût net')
        expect(page.locator('thead th').nth(1)).to_have_text('Carte')
        page.locator('#manual > summary').click()
        expect(page.locator('label[for=m-rbc]')).to_contain_text('unités locales pour 1 CAD')
        # Seulement deux taux saisis : dates/provenance/frais inclus déjà renseignés.
        local_day=page.evaluate("(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})()")
        for ident in ['rbc','bnc','wise']:
            expect(page.locator('#d-'+ident)).to_have_value(local_day)
            expect(page.locator('#origin-'+ident)).to_have_value('calculator')
        for ident in ['rbc','bnc']:
            expect(page.locator('#mode-'+ident)).to_have_value('inclusive')
            expect(page.locator('#included-'+ident)).to_be_enabled()
        expect(page.locator('#included-rbc')).to_have_value('3,1')
        page.locator('#m-rbc').fill('0,5');page.locator('#m-bnc').fill('0,625');page.locator('#applyManual').click()
        expect(page.locator('#rows tr').filter(has_text='RBC Avion').locator('td').nth(4)).to_contain_text('200,00')
        expect(page.locator('#rows tr').filter(has_text='BNC World Elite').locator('td').nth(4)).to_contain_text('160,00')
        # Modifier les frais applicables ne doit pas réinterpréter les frais du taux déjà recopié.
        page.locator('#settingsButton').click();page.locator('#s-rbcFX').fill('4');page.locator('#settingsForm button[type=submit]').click()
        expect(page.locator('#included-rbc')).to_have_value('3,1')
        page.locator('#applyManual').click();expect(page.locator('#rows tr').filter(has_text='RBC Avion').locator('td').nth(4)).to_contain_text('201,75')
        page.locator('#settingsButton').click();page.locator('#s-rbcFX').fill('3.1');page.locator('#settingsForm button[type=submit]').click()
        # Une date historique explicitement saisie reste respectée.
        page.locator('#d-rbc').fill('2026-01-01');page.locator('#applyManual').click()
        expect(page.locator('#rows tr').filter(has_text='RBC Avion')).to_contain_text('2026-01-01')
        page.locator('#amount').fill('101')
        for ident in ['rbc','bnc','wise']:expect(page.locator('#d-'+ident)).to_have_value(local_day)
        page.locator('#amount').fill('100')
        for currency in ['EUR','USD','IDR','AUD','JPY']:
            page.locator('#currency').select_option(currency)
            for ident in ['rbc','bnc','wise']:expect(page.locator('#d-'+ident)).to_have_value(local_day)
            for ident,rate in [('rbc',str(1/1.5)),('bnc',str(1/1.51))]:
                page.locator('#m-'+ident).fill(rate);page.locator('#d-'+ident).fill(day);page.locator('#mode-'+ident).select_option('exclusive')
            page.locator('#d-wise').fill(day);page.locator('#wiseTotal').fill('158.07');page.locator('#wiseFee').fill('0.70')
            page.locator('#applyManual').click()
            expect(page.locator('#status')).to_contain_text('Consultation :')
            wise=page.locator('#rows tr').filter(has_text='Wise Debit')
            expect(wise.locator('td').nth(4)).to_contain_text('158,07')
            expect(wise.locator('td').nth(3)).to_contain_text('0,70')
            expect(page.locator('#rows tr')).to_have_count(3)
            assert all('Indisponible' not in tr.locator('td').nth(0).inner_text() for tr in page.locator('#rows tr').all())
            print('TEST LOCAL application',currency,'OK',flush=True)
        # Entrée inverse : 2 unités locales pour 1 CAD => 100 unités coûtent 50 CAD hors frais.
        page.locator('#m-rbc').fill('2');page.locator('#applyManual').click()
        rbc=page.locator('#rows tr').filter(has_text='RBC Avion')
        expect(rbc.locator('td').nth(2)).to_contain_text('50,00')
        # Taux Mastercard frais inclus : l'inverse doit conserver les frais une seule fois.
        page.locator('#m-bnc').fill(str(1/1.6052525));page.locator('#mode-bnc').select_option('inclusive');page.locator('#included-bnc').fill('2,5');page.locator('#applyManual').click()
        bnc=page.locator('#rows tr').filter(has_text='BNC World Elite')
        expect(bnc.locator('td').nth(4)).to_contain_text('160,53')
        # Collage d'un taux anglais avec séparateur de milliers, sans arrondi intermédiaire.
        page.locator('#m-rbc').fill('12,800.25');page.locator('#applyManual').click()
        expect(page.locator('#rows tr').filter(has_text='RBC Avion')).to_contain_text('12800.25 unités locales pour 1 CAD')
        # Wise : même convention inverse avec frais CAD saisis, sans devis total.
        page.locator('#wiseTotal').fill('');page.locator('#m-wise').fill('2');page.locator('#wiseFee').fill('1');page.locator('#applyManual').click()
        wise=page.locator('#rows tr').filter(has_text='Wise Debit')
        expect(wise.locator('td').nth(2)).to_contain_text('50,00');expect(wise.locator('td').nth(4)).to_contain_text('51,00');expect(wise.locator('td').nth(3)).to_contain_text('1,00')
        page.locator('#m-rbc').fill('0');page.locator('#applyManual').click();expect(page.locator('#status')).to_contain_text('positif')
        page.locator('#amount').fill('101');expect(page.locator('#wiseTotal')).to_have_value('');expect(page.locator('#results')).to_be_hidden()
        context.set_offline(True);page.locator('#compareForm button').click();expect(page.locator('#status')).to_contain_text('Consultation :');context.set_offline(False)
        page.set_viewport_size({'width':390,'height':844});page.goto(origin);expect(page.locator('#settingsButton')).to_be_visible()
        page.screenshot(path=str(OUT/'revision-mobile.png'),full_page=True)
        assert not errors,errors
        assert not external,external
        b.close()
    previous=json.loads((OUT/'summary.json').read_text()) if (OUT/'summary.json').exists() else {}
    (OUT/'summary.json').write_text(json.dumps({'testOnly':True,'financialProviderRequests':0,'collectorCases':results or previous.get('collectorCases',[]),'appCurrencies':['EUR','USD','IDR','AUD','JPY'],'pageErrors':errors},indent=2))
    print(f'Tests Chromium : {len(results)} parcours de collecteur LOCAUX dans cette exécution, 5 devises dans la nouvelle application, vues mobile/desktop, 0 requête fournisseur.',flush=True)
finally:server.shutdown()
