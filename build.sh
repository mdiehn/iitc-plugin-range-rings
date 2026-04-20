#!/usr/bin/env bash
set -euo pipefail

mkdir -p dist

cat \
  src/banner.js \
  src/wrapper-start.js \
  src/constants.js \
  src/state.js \
  src/util.js \
  src/model.js \
  src/storage.js \
  src/render.js \
  src/ui.js \
  src/actions.js \
  src/interaction.js \
  src/wrapper-end.js \
  > dist/range-rings.user.js

echo "Wrote dist/range-rings.user.js"
