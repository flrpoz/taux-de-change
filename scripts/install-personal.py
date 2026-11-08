"""Install macOS user agents; invoke only on the user's Mac, never in CI."""
import argparse, os, plistlib, shutil, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def definitions(root,home,node,python,host):
 data=home/'.carte-claire-personnel'
 common={'WorkingDirectory':str(root),'EnvironmentVariables':{'PATH':str(Path(node).parent)+':/usr/bin:/bin:/usr/sbin:/sbin','PYTHON':str(python),'NODE':str(node),'CARTE_CLAIRE_PRIVATE_DIR':str(data)},'StandardOutPath':str(data/'agent.log'),'StandardErrorPath':str(data/'agent-error.log')}
 return {
 'ca.carteclaire.personnel.serveur':{**common,'Label':'ca.carteclaire.personnel.serveur','ProgramArguments':[str(python),str(root/'scripts/personal-server.py'),'--host',host],'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':30},
 'ca.carteclaire.personnel.collecte':{**common,'Label':'ca.carteclaire.personnel.collecte','ProgramArguments':[str(node),str(root/'scripts/personal-run.mjs')],'RunAtLoad':True,'StartCalendarInterval':{'Hour':9,'Minute':37}}
 }
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--host',default='127.0.0.1');ap.add_argument('--output-only',type=Path);args=ap.parse_args()
 if sys.platform!='darwin' and not args.output_only:ap.error('Installation réservée à macOS')
 import importlib.util
 spec=importlib.util.spec_from_file_location('private_server',ROOT/'scripts/personal-server.py')
 server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
 if args.host in ['0.0.0.0','::'] or not server.safe_address(args.host):ap.error('Adresse privée explicite requise')
 node=shutil.which('node')
 if not node:ap.error('Node.js est requis : installer la version LTS depuis nodejs.org')
 home=Path.home();folder=args.output_only or home/'Library/LaunchAgents';folder.mkdir(parents=True,exist_ok=True)
 data=home/'.carte-claire-personnel'
 if not args.output_only:data.mkdir(mode=0o700,exist_ok=True);data.chmod(0o700)
 for label,value in definitions(ROOT,home,node,Path(sys.executable),args.host).items():
  target=folder/(label+'.plist');target.write_bytes(plistlib.dumps(value));target.chmod(0o600)
  if not args.output_only:
   domain=f'gui/{os.getuid()}'
   subprocess.run(['launchctl','bootout',domain,str(target)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   subprocess.run(['launchctl','bootstrap',domain,str(target)],check=True)
 print('Configuration prête. '+('Plists générés seulement.' if args.output_only else f'Ouvrir http://{args.host}:8765 dans Safari.'))
