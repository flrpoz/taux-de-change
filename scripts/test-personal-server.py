"""No provider access: privacy boundaries and Mac plist definitions only."""
import importlib.util, threading, urllib.request, urllib.error, tempfile, json, plistlib
from pathlib import Path
from http.server import ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
s=load('private_server',ROOT/'scripts/personal-server.py');installer=load('installer',ROOT/'scripts/install-personal.py')
with tempfile.TemporaryDirectory() as d:
 s.DATA=Path(d);(s.DATA/'rates.json').write_text('{"schemaVersion":3,"currencies":{}}');(s.DATA/'secret.txt').write_text('not served')
 server=ThreadingHTTPServer(('127.0.0.1',0),s.make_handler('127.0.0.1',0));port=server.server_port;server.RequestHandlerClass=s.make_handler('127.0.0.1',port)
 threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{port}'
 def request(path,headers={},body=None):
  try:
   r=urllib.request.urlopen(urllib.request.Request(origin+path,headers=headers,data=body));return r.status,r.read(),r.headers
  except urllib.error.HTTPError as e:return e.code,e.read(),e.headers
 assert request('/rates.json')[0]==200
 assert request('/secret.txt')[0]==404 and request('/../config/personal-sources.json')[0]==404
 assert request('/rates.json',{'Host':'evil.example'})[0]==403
 assert request('/collect',{'Origin':'https://evil.example','Content-Type':'application/json'},b'{}')[0]==403
 assert request('/collect',{'Origin':origin,'Content-Type':'application/json'},b'{"currency":"CAD","amount":100}')[0]==200
 assert request('/collect',{'Origin':origin,'Content-Type':'application/json'},b'{"currency":"JPY","amount":-1}')[0]==400
 js=request('/app.js')[1].decode();assert "fetch('/collect'" in js and 'serviceWorker.register' not in js
 assert request('/rates.json')[2]['Cache-Control']=='no-store'
 server.shutdown()
 assert s.safe_address('127.0.0.1') and s.safe_address('100.80.0.1') and not s.safe_address('8.8.8.8')
 defs=installer.definitions(ROOT,Path(d),'/opt/homebrew/bin/node','/tmp/venv/bin/python','127.0.0.1')
 for value in defs.values():assert plistlib.loads(plistlib.dumps(value))==value
 assert defs['ca.carteclaire.personnel.collecte']['StartCalendarInterval']=={'Hour':9,'Minute':37}
print('Privé : serveur en loopback, aucun accès aux preuves, Host/Origin vérifiés, POST validé, aucun service worker; plists Mac générés seulement. Aucun fournisseur contacté.')
