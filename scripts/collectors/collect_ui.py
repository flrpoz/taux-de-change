"""POC autonome via UI officielles. Ne modifie jamais Carte Claire/rates.json.
Une invocation = un processus, navigateur et profil éphémère neufs. Aucun stdin.
"""
import argparse, os, json, re, time, hashlib, sys
from urllib.parse import urlparse
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from pathlib import Path
from contextlib import nullcontext
from playwright.sync_api import sync_playwright, expect

URLS={
 'mastercard':'https://www.mastercard.com/ca/en/personal/get-support/currency-exchange-rate-converter.html',
 'visa':'https://www.visa.ca/en_CA/support/consumer/travel-support/exchange-rate-calculator.html',
 'wise':'https://wise.com/ca/pricing/card-fees',
}
def now(): return datetime.now(timezone.utc).isoformat()
def number(s): return Decimal(s.replace(',','').replace('%','').strip())

def main():
 ap=argparse.ArgumentParser();ap.add_argument('provider',choices=URLS);ap.add_argument('--currency',default='EUR',choices=['EUR','USD','IDR','AUD','JPY']);ap.add_argument('--amount',default='100');ap.add_argument('--inspect-calendar',action='store_true');ap.add_argument('--chromium-sandbox',action='store_true');ap.add_argument('--fixture-url');ap.add_argument('--output-dir',default='artifacts/browser')
 args=ap.parse_args()
 if args.fixture_url:
  parsed=urlparse(args.fixture_url)
  if parsed.scheme!='http' or parsed.hostname not in ['127.0.0.1','localhost']:raise ValueError('Fixture must be loopback HTTP')
  URLS[args.provider]=args.fixture_url
 else:
  config=json.loads((Path(__file__).resolve().parents[2]/'config/sources.json').read_text())
  policy=config['providers'][args.provider];grant=policy.get('permission') or {}
  today=datetime.now(timezone.utc).date().isoformat()
  if not(policy.get('enabled') is True and grant.get('collection') is True and grant.get('publication') is True and len(grant.get('evidence','').strip())>10 and re.fullmatch(r'\d{4}-\d{2}-\d{2}',grant.get('reviewedAt','')) and grant['reviewedAt']<=today and (not grant.get('expiresAt') or grant['expiresAt']>today)):
   print(json.dumps({'status':'policy-blocked','provider':args.provider,'reason':policy['reason']}));return 2
 out=Path(args.output_dir)/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'-'+args.provider)
 out.mkdir(parents=True)
 result={'provider':args.provider,'source_url':URLS[args.provider],'currency':args.currency,'amount':args.amount,'started_at':now(),'pid':os.getpid(),'interactive':False,'testOnly':bool(args.fixture_url),'openai_api_calls':0,'browser_sandbox':args.chromium_sandbox,'status':'failed','steps':[],'http_errors':[],'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
 started=time.monotonic();browser=None;page=None
 def log(step): result['steps'].append({'at':now(),'step':step});print(step,flush=True)
 def shot(name):
  path=out/(name+'.png');page.screenshot(path=str(path),full_page=False)
  result.setdefault('screenshots',[]).append({'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 def visible_text():
  # innerText du body ne traverse pas les shadow roots Visa. Lecture UI seulement.
  return page.locator('body, p, h1, h2, h3, span, div').evaluate_all('''es => es.filter(e=>e.getBoundingClientRect().width>0 && getComputedStyle(e).visibility==='visible').map(e=>e.innerText).join('\\n')''')
 runtime=sync_playwright().start()
 try:
  with nullcontext(runtime) as p:
   proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
   opts={'headless':True,'chromium_sandbox':args.chromium_sandbox}
   if os.environ.get('CARTE_CLAIRE_CHROMIUM'):opts['executable_path']=os.environ['CARTE_CLAIRE_CHROMIUM']
   elif Path('/usr/bin/chromium').exists():opts['executable_path']='/usr/bin/chromium'
   if proxy:opts['proxy']={'server':proxy,'bypass':'127.0.0.1,localhost'}
   log('launch_fresh_browser')
   browser=p.chromium.launch(**opts)
   result['browser_version']=browser.version
   page=browser.new_page(viewport={'width':1280,'height':1000})
   page.set_default_timeout(15000)
   if args.fixture_url:
    allowed=urlparse(args.fixture_url).netloc
    page.route('**/*',lambda route: route.continue_() if urlparse(route.request.url).netloc==allowed else route.abort())
   page.on('response',lambda r: result['http_errors'].append({'status':r.status,'url':r.url.split('?')[0]}) if r.status>=400 else None)
   log('navigate')
   r=page.goto(URLS[args.provider],wait_until='domcontentloaded',timeout=45000)
   result['navigation_http']=r.status if r else None
   if not r or r.status!=200:raise ValueError('Navigation did not return HTTP 200')
   page.wait_for_timeout(2000)
   if args.provider=='mastercard':
    log('reject_optional_cookies')
    page.locator('#onetrust-reject-all-handler').click()
    for selector,code in [('#selectPlaceholder1Input',args.currency),('#selectPlaceholder2Input','CAD')]:
     log('select_'+code)
     field=page.locator(selector);field.click();field.fill(code)
     option=page.locator('.made-c-overflow-menu__link:visible').filter(has_text=re.compile(r' - '+code+r'$'))
     expect(option).to_have_count(1);option.click()
     expect(field).to_have_value(re.compile(r' - '+code+r'$'))
    page.locator('#amountInput').fill(args.amount)
    page.locator('#bankFeeInput').fill('0')
    log('open_calendar')
    page.locator('input[placeholder="DD MM YYYY"]').click()
    page.wait_for_timeout(500)
    details=page.locator('forms-ui-date-picker').evaluate('(e)=>e.outerHTML')
    (out/'calendar-dom.json').write_text(json.dumps(details,indent=2))
    if args.inspect_calendar:
     shot('calendar');print(json.dumps(details),flush=True);raise ValueError('Exploration calendar only; no collection attempted')
    # Selector defined from DOM observed during exploration, no hardcoded date.
    days=page.locator('forms-ui-date-grid span[role="cell"]:not(.disabled-date)')
    if not days.count():raise ValueError('No supported enabled calendar days; UI changed')
    enabled=days.all();latest=max(enabled,key=lambda e:datetime.strptime(e.get_attribute('data-index'),'%m/%d/%Y'))
    selected_raw=datetime.strptime(latest.get_attribute('data-index'),'%m/%d/%Y')
    maximum=datetime.strptime(page.locator('forms-ui-date-picker').get_attribute('max-date'),'%m/%d/%Y')
    if selected_raw!=maximum:raise ValueError('Calendar not showing most recent selectable date')
    result['calendar_selected_label']=latest.get_attribute('aria-label')
    latest.click()
    result['selected_date']=page.locator('input[placeholder="DD MM YYYY"]').input_value()
    expect(page.locator('#bankFeeInput')).to_have_value('0%')
    shot('parameters')
    log('calculate')
    page.get_by_role('button',name='Calculate',exact=True).click()
    expect(page.get_by_text('Current Rate :',exact=True)).to_be_visible(timeout=20000)
    text=page.locator('body').inner_text()
    rate=re.search(r'1 [^\n]*\('+args.currency+r'\) = ([\d.]+) CANADIAN DOLLAR \(CAD\)',text)
    amount=re.search(r'Transaction Amount\s*:\s*([\d,.]+) '+args.currency+r' = ([\d,.]+) CAD',text)
    date=re.search(r'as of (.*?) and includes',text)
    if not(rate and amount and date):raise ValueError('Incomplete displayed Mastercard result')
    if number(amount[1])!=number(args.amount):raise ValueError('Source amount mismatch')
    if (number(args.amount)*number(rate[1])).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)!=number(amount[2]):raise ValueError('Amount / rate mismatch')
    result.update(rate_cad_per_unit=rate[1],amount_cad=amount[2],effective_date_displayed=date[1],bank_fee_percent='0',status='validated')
   elif args.provider=='wise':
    log('select_target_currency')
    expect(page.locator('#SOURCE-inputSelectedCurrency')).to_have_text('CAD')
    page.locator('#TARGET-inputSelectedCurrency').click()
    page.locator('#TARGET-inputSelectedCurrencySearch').fill(args.currency)
    page.get_by_role('option').filter(has_text=re.compile(args.currency)).click()
    expect(page.locator('#TARGET-inputSelectedCurrency')).to_have_text(args.currency)
    log('set_foreign_purchase_amount')
    previous=page.locator('#SOURCE-input').input_value()
    page.locator('#TARGET-input').fill(args.amount)
    page.locator('#TARGET-input').press('Tab')
    expect(page.locator('#SOURCE-input')).not_to_have_value(previous,timeout=20000)
    page.wait_for_timeout(2000)
    text=page.locator('body').inner_text()
    fees={}
    for label in ['Fixed fee','Variable fee','Total included fees']:
     m=re.search(re.escape(label)+r'\s*([\d,.]+) CAD',text)
     if not m:raise ValueError('Missing Wise '+label)
     fees[label]=m[1]
    if number(fees['Fixed fee'])+number(fees['Variable fee'])!=number(fees['Total included fees']):raise ValueError('Wise fee mismatch')
    debit=number(page.locator('#SOURCE-input').input_value())
    target=number(page.locator('#TARGET-input').input_value())
    if target!=number(args.amount) or debit<=number(fees['Total included fees']):raise ValueError('Invalid Wise amounts')
    result.update(status='validated',amount_cad=str(debit),fees_cad=fees,rate_cad_per_unit=None,
      effective_rate_derived_cad_per_unit=str(debit/target),effective_date_displayed=None,
      limitations=['No effective rate timestamp displayed','No precise fee-free rate displayed; do not infer one from rounded amounts'])
   else:
    log('dismiss_optional_cookies')
    # Cookie banner links are not buttons on this version of Visa.
    reject=page.get_by_text('Reject all',exact=True)
    if reject.count():reject.click()
    page.locator('#input_amount_paid').fill(args.amount)
    for selector,code in [('#autosuggestinput_from',args.currency),('#autosuggestinput_to','CAD')]:
     log('select_'+code)
     field=page.locator(selector);field.fill(code);field.press('ArrowDown');field.press('Enter')
    page.get_by_role('button',name='edit date and bank rate',exact=True).click()
    page.locator('#input_bank_rate').fill('0')
    page.locator('#input_bank_rate').press('Tab')
    result['selected_date']=page.locator('#dateinput_date').input_value()
    expect(page.locator('#input_bank_rate')).to_have_value('0')
    shot('parameters')
    log('calculate')
    page.get_by_role('button',name='Calculate Conversion',exact=True).click()
    deadline=time.monotonic()+30
    while True:
     text=visible_text()
     amount=re.search(r'(?<![\d.])'+re.escape(args.amount)+r'(?:\.00)? '+args.currency+r' = ([\d,.]+) CAD',text)
     rate=re.search(r'1 '+args.currency+r' = ([\d,.]+) CAD',text)
     if amount and rate:break
     if time.monotonic()>deadline:raise ValueError('No complete Visa result displayed within 30 seconds')
     page.wait_for_timeout(500)
    # Visa prints a rounded unit rate but a more precise total: allow rounding
    # uncertainty of 0.5 of the last displayed rate digit, scaled by amount.
    unit=number(rate[1]);total=number(amount[1]);tol=Decimal(5).scaleb(unit.as_tuple().exponent-1)*number(args.amount)
    if abs(unit*number(args.amount)-total)>tol+Decimal('0.000001'):raise ValueError('Visa amount/rate mismatch')
    result.update(status='validated',rate_cad_per_unit=rate[1],amount_cad=amount[1],bank_fee_percent='0',effective_date_displayed=result['selected_date'],rounding_tolerance_cad=str(tol))
   if args.provider=='mastercard':page.get_by_text('Current Rate :',exact=True).scroll_into_view_if_needed()
   elif args.provider=='wise':page.locator('#SOURCE-input').scroll_into_view_if_needed()
   else:page.locator('#input_amount_paid').scroll_into_view_if_needed()
   shot('result')
   (out/'visible-text.txt').write_text(visible_text())
   (out/'page.html').write_text(page.content())
   result['final_url']=page.url
   browser.close();browser=None
 except Exception as e:
  result['status']='failed'
  result['error']=type(e).__name__+': '+str(e)[:3000]
  if page:
   try:
    shot('failure');(out/'visible-text.txt').write_text(visible_text())
   except Exception:pass
 finally:
  if browser:
   try:browser.close()
   except Exception:pass
  runtime.stop()
  if args.fixture_url and result['status']=='validated':result['status']='test-validated'
  result['finished_at']=now();result['duration_seconds']=round(time.monotonic()-started,2)
  (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
  print(json.dumps({'result_file':str(out/'result.json'),**result},ensure_ascii=False),flush=True)
 return 0 if result['status'] in ['validated','test-validated'] else 1
if __name__=='__main__':sys.exit(main())
