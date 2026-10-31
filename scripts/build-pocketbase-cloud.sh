#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

go test ./...
npm --prefix ui ci
npm --prefix ui test
npm --prefix ui run build

test -d pb_hooks
test -d pb_migrations
test -f pb_public/index.html
find pb_public -type f -print -quit | grep -q .

printf 'PocketBase Cloud build ready: pb_hooks/, pb_migrations/, pb_public/\n'