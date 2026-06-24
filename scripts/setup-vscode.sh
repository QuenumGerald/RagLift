#!/usr/bin/env sh
set -e

if [ -z "${NVM_DIR:-}" ]; then
  export NVM_DIR="$HOME/.nvm"
fi

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found at $NVM_DIR. Install nvm first."
  exit 1
fi

. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20

if [ ! -x "$(command -v yo)" ]; then
  npm install -g yo generator-code
fi

yo code
