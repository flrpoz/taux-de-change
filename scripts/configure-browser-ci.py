"""Sélectionner le navigateur Playwright et autoriser son sandbox sur Ubuntu CI.
Profil AppArmor limité au chemin exact du binaire, sans désactivation globale.
"""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    executable=Path(p.chromium.executable_path).resolve()
    if not executable.is_file():raise RuntimeError('Installer Chromium avec Playwright avant cette étape')
    if any(c in str(executable) for c in ['"','\n','\r']):raise RuntimeError('Chemin de navigateur invalide')
    apparmor=Path('/sys/module/apparmor/parameters/enabled')
    if os.environ.get('GITHUB_ACTIONS')=='true' and apparmor.exists() and apparmor.read_text().strip()=='Y':
        profile=f'''abi <abi/4.0>,
include <tunables/global>
profile carte-claire-chromium "{executable}" flags=(unconfined) {{
  userns,
}}
'''
        subprocess.run(['sudo','tee','/etc/apparmor.d/carte-claire-chromium'],input=profile,text=True,stdout=subprocess.DEVNULL,check=True)
        subprocess.run(['sudo','apparmor_parser','-r','/etc/apparmor.d/carte-claire-chromium'],check=True)
    browser=p.chromium.launch(executable_path=str(executable),headless=True,chromium_sandbox=True)
    page=browser.new_page();page.set_content('<title>Test local du sandbox</title>')
    assert page.title()=='Test local du sandbox'
    metadata={'executable':str(executable),'version':browser.version,'chromiumSandbox':True,'financialProviderRequests':0}
    browser.close()
    if os.environ.get('GITHUB_ENV'):
        with open(os.environ['GITHUB_ENV'],'a') as f:f.write(f'CARTE_CLAIRE_CHROMIUM={executable}\n')
    out=Path('artifacts');out.mkdir(exist_ok=True)
    (out/'browser-runtime.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps(metadata))
