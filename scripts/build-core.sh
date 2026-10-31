#!/usr/bin/env bash
# Rebuild the vendored VisualFC WebAssembly core into src/core/.
# Vercel deploys the committed artifacts, so Rust is only needed when updating the core.
set -euo pipefail
cd "$(dirname "$0")/.."

repo="${VISUALFC_REPO:-https://github.com/yili6ms/VisualFC.git}"
ref="${VISUALFC_REF:-$(tr -d '[:space:]' < visualfc.ref)}"
src="${VISUALFC_DIR:-}"

if [[ -z "$src" ]]; then
  src=.visualfc
  rm -rf "$src"
  git init -q "$src"
  git -C "$src" fetch -q --depth 1 "$repo" "$ref"
  git -C "$src" checkout -q FETCH_HEAD
fi
commit="$(git -C "$src" rev-parse HEAD)"

# The WASM target lives in the rustup toolchain; prefer it over other cargo installs.
if command -v rustup >/dev/null; then
  PATH="$(dirname "$(rustup which cargo)"):$HOME/.cargo/bin:$PATH"
  export PATH
fi

bash "$src/scripts/build-wasm.sh"

out=src/core
rm -rf "$out"
mkdir -p "$out"
cp "$src"/target/wasm/{visual_fc.js,visual_fc_bg.wasm,visual_fc.d.ts,renderer.js,shaders.js} "$out/"
cp "$src/LICENSE" "$out/LICENSE"
printf '%s\n' "$commit" > "$out/VERSION"
echo "Built VisualFC core $commit into $out/"
