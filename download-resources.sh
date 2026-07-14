#!/usr/bin/env bash
# 从 mockaddress.com 拉取公开 JSON 数据到本地 data/
set -euo pipefail
BASE="https://mockaddress.com"
ROOT="$(cd "$(dirname "$0")" && pwd)"
DATA="$ROOT/data"
mkdir -p "$DATA"

FILES=(
  usData.json namesData.json usRealAddresses.json us_taxfree.min.json
  hkData.json ukData.json caData.json jpData.json jpNamesData.json jpRealAreas.json
  inData.json inPinAreas.json twData.json sgData.json deData.json
)

ok=0; fail=0
for f in "${FILES[@]}"; do
  url="$BASE/data/$f"
  out="$DATA/$f"
  echo "GET $url"
  if command -v curl >/dev/null 2>&1; then
    if curl -fsSL "$url" -o "$out"; then
      echo "  OK $(wc -c < "$out") bytes"
      ok=$((ok+1))
    else
      echo "  FAIL"; fail=$((fail+1)); rm -f "$out"
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -q -O "$out" "$url"; then
      echo "  OK $(wc -c < "$out") bytes"
      ok=$((ok+1))
    else
      echo "  FAIL"; fail=$((fail+1)); rm -f "$out"
    fi
  else
    echo "需要 curl 或 wget"; exit 1
  fi
done

if [[ -f "$DATA/namesData.json" ]]; then
  cp -f "$DATA/namesData.json" "$DATA/names-pool.json"
  echo "Synced names-pool.json"
fi

echo "Done success=$ok fail=$fail"
