#!/bin/sh
# 리눅스(systemd) 자동 실행 등록 — sudo ./install_autostart.sh
DIR="$(cd "$(dirname "$0")" && pwd)"; NODE="$(command -v node)"; [ -z "$NODE" ] && { echo "Node.js가 필요합니다"; exit 1; }
cat > /etc/systemd/system/neurosole.service <<UNIT
[Unit]
Description=NeuroSole server
After=network.target
[Service]
WorkingDirectory=$DIR
ExecStart=$NODE $DIR/server.js
Restart=always
Environment=PORT=8080
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now neurosole && echo "등록 완료: systemctl status neurosole"
