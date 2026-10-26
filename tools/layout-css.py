#!/usr/bin/env python3
"""Layout blocks in CSS: @media __DUO__ / __COVER__ / __INNERP__ { ... } become nested rules under the html class that
src/head.html sets (html.L-duo, html:not(.L-duo), html.L-innerp), wrapped in :where() so specificity is unchanged.
A selector inside that starts with html becomes & (the same element). Reads stdin, writes stdout."""
import re, sys
SEL = {"DUO": ":where(html.L-duo)", "COVER": ":where(html:not(.L-duo))", "INNERP": ":where(html.L-innerp)"}
s = sys.stdin.read(); out = []; pos = 0
for m in re.finditer(r"@media __(DUO|COVER|INNERP)__ \{", s):
    if m.start() < pos: continue
    i = m.end(); d = 1
    while d:
        c = s[i]; d += (c == "{") - (c == "}"); i += 1
    body = s[m.end():i - 1]
    body = re.sub(r"(^|[{};,]\s*|\n\s*)html(?=[.,\s{:])", lambda k: k.group(1) + "&", body)
    out.append(s[pos:m.start()]); out.append(SEL[m.group(1)] + " {" + body + "}"); pos = i
out.append(s[pos:]); r = "".join(out)
if re.search(r"__(DUO|COVER|INNERP|INNERDEV)__", r): sys.exit("layout-css: a layout token is left over")
sys.stdout.write(r)
