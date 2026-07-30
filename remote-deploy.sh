#!/usr/bin/env bash
# Deploy Tarajuvva on the Lightsail box over SSH (Host: tarajuvva).
# One-time setup: authorize ~/.ssh/id_ed25519_tarajuvva.pub on the server (see README note in chat).
set -euo pipefail
ssh -t tarajuvva 'cd /var/www/tarajuvva && ./deploy.sh'
