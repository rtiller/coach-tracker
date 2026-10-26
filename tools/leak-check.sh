#!/usr/bin/env bash
# Leak check: no personal names or box paths in any tracked text file. The only allowed owner mentions are the
# public repo URL and its Pages URL. It also fails on leftover template placeholders (a capitalized name in curly braces). The pattern is assembled from pieces so this file does not match itself.
set -u
cd "$(dirname "$0")/.."
N1='Ro''b'; N2='Til''ler'; N3='rtil''ler'; N4='Ja''ck'; P1='/work''space'; P2='/home''/box'
PAT="\\b$N1\\b|$N2|\\b$N4\\b|$P1|$P2"
ALLOW="github\\.com/$N3/coach-tracker|$N3\\.github\\.io/coach-tracker"
FILES=$(git ls-files | rg -v -i '\.(png|jpe?g|gif|webp|ico)$')
# Remove the allowed URLs from each line first, then look for anything left.
HITS=$(printf '%s\n' $FILES | xargs rg -n -i --no-messages -e "$PAT|$N3" 2>/dev/null \
  | sed -E "s#($ALLOW)##Ig" | rg -i -e "^[^:]+:[0-9]+:.*($PAT|$N3)")
# Leftover template placeholders: a capitalized name in curly braces. A JS template expression (dollar sign first) is not one.
PH=$(printf '%s\n' $FILES | xargs rg -n --no-messages -e '(^|[^$])\{[A-Z][A-Z0-9_]{2,}\}' 2>/dev/null)
if [ -n "$HITS$PH" ]; then echo "LEAK CHECK FAILED:"; printf '%s\n' "$HITS" "$PH" | sed '/^$/d'; exit 1; fi
echo "leak check: clean ($(printf '%s\n' $FILES | wc -l) text files)"
