#!/bin/sh
# Dump what `lask` says about a module, for the site's module reference:
# the function list, each function's help, and the declared command words,
# as JSON, with the README and the module sources beside them.
#
# It runs on the host, not in the site's Node container, because it needs
# the lask binary: lask's own help is the reference, so nothing here parses
# Lask source.
#
#   sh scripts/module-help.sh <module checkout> <ref> <out dir>
set -eu

src=$1
ref=$2
out=$3

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

git -C "$src" archive "$ref" | tar -x -C "$tmp"

rm -rf "$out"
mkdir -p "$out/functions"
cp "$tmp/README.md" "$out/README.md"
mkdir -p "$out/lib"
cp "$tmp"/lib/*.lask "$out/lib/"

out=$(cd "$out" && pwd)

# Run from the module's root, so the help names its files relative to it
# (lib/python.lask), as they are in the repository. The JSON listing is
# the last line; the option help comes first.
cd "$tmp"
lask run --format json --help </dev/null | tail -n 1 > "$out/functions.json"
lask cmd --format json --help </dev/null | tail -n 1 > "$out/commands.json"

# One help document per function in the listing.
grep -o '"name":"[a-z_][a-z0-9_]*"' "$out/functions.json" | cut -d'"' -f4 | while read -r fn; do
  lask run --format json "$fn" --help </dev/null | tail -n 1 > "$out/functions/$fn.json"
done

printf '%s\n' "$ref" > "$out/ref"
echo "module-help: $(ls "$out/functions" | wc -l | tr -d ' ') functions at $ref"
