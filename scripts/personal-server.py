"""Private comparison: loopback or an explicitly selected private/VPN address only.
No upload, GitHub API, account credentials, public tunnel, or collection at startup.
"""
import argparse, ipaddress, json, os, subprocess, threading, time
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
DATA=Path(os.environ.get('CARTE_CLAIRE_PRIVATE_DIR',str(Path.home()/'.carte-claire-personnel'))).resolve()
COLLECTION=threading.Lock()

def safe_address(value):
    addr=ipaddress.ip_address(value)
    return addr.is_loopback or addr.is_private or addr in ipaddress.ip_network('100.64.0.0/10')

def make_handler(host,port):
 class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass # Purchase amounts must not enter access logs.
    def reply(self,status,data,kind='application/json'):
        self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def valid_host(self):
        # Defend DNS rebinding; no wildcard Host and no public listening interface.
        return self.headers.get('Host') in {f'{host}:{port}',f'localhost:{port}' if host=='127.0.0.1' else f'{host}:{port}'}
    def do_GET(self):
        if not self.valid_host():return self.reply(403,b'{}')
        name=urlsplit(self.path).path
        if name=='/rates.json':
            try:body=(DATA/'rates.json').read_bytes()
            except FileNotFoundError:body=b'{"schemaVersion":3,"currencies":{}}'
            return self.reply(200,body)
        if name=='/sw.js':return self.reply(404,b'')
        allowed={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/engine.mjs':'engine.mjs','/provenance.mjs':'provenance.mjs','/snapshot.mjs':'snapshot.mjs','/style.css':'style.css','/icon.svg':'icon.svg','/icon-180.png':'icon-180.png','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png','/manifest.webmanifest':'manifest.webmanifest'}
        if name not in allowed:return self.reply(404,b'{}')
        body=(ROOT/'dist'/allowed[name]).read_bytes()
        if name=='/app.js':
            text=body.decode().replace("if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});",'')
            text=text.replace('const rates=await loadRates(currency);', "window.privateCollectionWarning='';try{const response=await fetch('/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currency,amount})});if(!response.ok)throw Error('Collecte privée indisponible');}catch(e){window.privateCollectionWarning=' Échec de collecte : derniers taux datés conservés.';}const rates=await loadRates(currency);")
            text=text.replace('return;}render();',"return;}render();if(window.privateCollectionWarning)$('status').textContent+=window.privateCollectionWarning;")
            body=text.encode()
        if name in ['/','/index.html']:
            text=body.decode().replace('CARTE CLAIRE','CARTE CLAIRE · PRIVÉ')
            text=text.replace('Visa et Mastercard : aucun accès officiel automatique autorisé n’est configuré. Le site public Mastercard interdit l’accès automatisé et les API de production exigent un accès approuvé.', 'Version privée : lecture du calculateur Visa pour votre usage personnel, sans droit de publication revendiqué. Mastercard reste bloqué : ses conditions interdisent les systèmes automatisés.')
            text=text.replace('Aucun compte requis.','Données conservées sur votre hôte privé. Visa et Wise sont interrogés au clic sur Comparer; Mastercard reste bloqué par ses conditions.')
            body=text.encode()
        kind='text/html; charset=utf-8' if name in ['/','/index.html'] else 'text/javascript; charset=utf-8' if name.endswith(('.js','.mjs')) else 'text/css' if name.endswith('.css') else 'image/png' if name.endswith('.png') else 'image/svg+xml' if name.endswith('.svg') else 'application/json'
        self.reply(200,body,kind)
    def do_POST(self):
        origin=f'http://{self.headers.get("Host", "")}'
        if not self.valid_host() or self.headers.get('Origin')!=origin or self.path!='/collect' or self.headers.get('Content-Type')!='application/json':return self.reply(403,b'{}')
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=1024:raise ValueError()
            q=json.loads(self.rfile.read(length));currency=q['currency'];amount=float(q['amount'])
            if currency not in ['EUR','USD','IDR','AUD','JPY','CAD'] or not 0<amount<=1e9:raise ValueError()
        except (ValueError,KeyError,TypeError):return self.reply(400,b'{}')
        if currency=='CAD':return self.reply(200,b'{"conversion":false}')
        if not COLLECTION.acquire(blocking=False):return self.reply(409,b'{"error":"Collecte en cours"}')
        try:
            # Only reuse a recent validated quote for exactly the requested amount.
            try:
                snapshot=json.loads((DATA/'rates.json').read_text())
                entries=snapshot['currencies'][currency]
                from datetime import datetime,timezone
                recent=all(datetime.now(timezone.utc).timestamp()-datetime.fromisoformat(entries[p]['collectedAt']).timestamp()<3600 for p in ['visa','wise'])
                if recent and entries['wise']['quote']['amount']==amount:return self.reply(200,b'{"cached":true}')
            except (OSError,KeyError,ValueError,TypeError):pass
            report=DATA/'last-run.json'
            if report.exists() and time.time()-report.stat().st_mtime<30:return self.reply(429,b'{"error":"Attendre 30 secondes entre collectes"}')
            result=subprocess.run([os.environ.get('NODE','node'),str(ROOT/'scripts/personal-run.mjs'),'--currency',currency,'--amount',str(amount)],cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=190)
            return self.reply(200 if result.returncode==0 else 502,b'{"completed":true}' if result.returncode==0 else b'{"error":"Collecte incomplete; derniers taux conserves"}')
        except subprocess.TimeoutExpired:return self.reply(504,b'{"error":"Collecte expiree"}')
        finally:COLLECTION.release()
 return Handler

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--host',default='127.0.0.1');ap.add_argument('--port',type=int,default=8765);args=ap.parse_args()
    if not safe_address(args.host):ap.error('Utiliser uniquement loopback ou une adresse LAN/VPN privée explicite; aucun 0.0.0.0.')
    if args.host in ['0.0.0.0','::']:ap.error('Écoute globale interdite')
    if DATA==ROOT or ROOT in DATA.parents or DATA in ROOT.parents:ap.error('Les données doivent rester hors du dépôt')
    DATA.mkdir(parents=True,exist_ok=True,mode=0o700)
    print(f'Carte Claire privée : http://{args.host}:{args.port} — aucun déploiement public',flush=True)
    ThreadingHTTPServer((args.host,args.port),make_handler(args.host,args.port)).serve_forever()
