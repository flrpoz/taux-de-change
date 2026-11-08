#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo 'Installez Node.js LTS depuis https://nodejs.org puis relancez ce fichier.'
  read -r -p 'Entrée pour fermer.' _cc_reply
  exit 1
fi
if ! command -v python3 >/dev/null; then
  echo 'Installez Python 3 depuis https://www.python.org/downloads/macos/ puis relancez.'
  read -r -p 'Entrée pour fermer.' _cc_reply
  exit 1
fi
python3 -m venv .personal/venv
.personal/venv/bin/python -m pip install -r requirements.txt
.personal/venv/bin/python -m playwright install chromium
.personal/venv/bin/python scripts/install-personal.py
open http://127.0.0.1:8765
