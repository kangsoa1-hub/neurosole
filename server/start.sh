#!/bin/sh
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js가 필요합니다: https://nodejs.org (LTS)"; exit 1; }
node server.js
