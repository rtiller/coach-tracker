#!/bin/sh
# Assembles index.html from src/. index.html is the shipped artifact; src/ is only for editing.
#
# Layout modes (v0.1.3.3): ONE definition, the head script in src/head.html, from the layout viewport only. The maintainer
# approved this rule on 2026-10-25 after the device-screen rule failed on the real Duo (Safari reported the wrong screen).
#   inner   the short side of the window is at least 520px: html.duo-inner. Every slab phone tops out near 440 (portrait
#           width, landscape height), the Duo inner screen is 585 to 669 on its short side.
#   DUO     inner and wider than tall: html.L-duo, two panes, the gap on the fold.
#   INNERP  inner and not wider than tall: html.L-innerp, the inner portrait density (one column).
#   COVER   everything but DUO: one column, today first; Week and progress opens as a page or sheet.
#   the Counter  COVER, at least 600 wide, wider than tall, under 500 tall: html.counter (syncCounter, src/app6.js).
# Both are re-checked on resize, orientationchange and unfold, and frozen while a text field has focus and for 700ms
# after, so a keyboard never flips the layout. In CSS, src/ writes @media __DUO__ / __COVER__ / __INNERP__ { ... };
# tools/layout-css.py turns those into rules under the html classes (inside :where(), so specificity is unchanged).
# __WIDE__ stays a media query: density only, 24px gutters and roomier set rows from 600px wide, in any mode.
# Size table (CSS px viewports) and where each lands:
#   Duo cover portrait   382x560, 382x644             COVER
#   Duo cover landscape  644x382, 678x396, 678x466     COVER + the Counter
#   Duo inner portrait   669x751, 669x835             COVER + INNERP
#   Duo inner landscape  951x585, 951x669             DUO
#   slab phones, portrait   iPhone 375x667 ... 440x956, Android 360x780 ... 412x915      COVER (one column)
#   slab phones, landscape  the same sizes turned (667x375 ... 956x440, 780x360 ... 915x412)   COVER + the Counter
WIDE='(min-width: 600px)'
# Get your own copy (About): the page carries itself. Pass 1 builds the page with a marker line "@@APP_SRC@@" inside
# <script type="text/plain" id="app-src">; pass 2 puts pass 1, with "~" written "~0" and "<" written "~1", in place of
# that line. ownCopy() in src/app6.js decodes it and puts the encoded text back over the marker, which gives this file
# byte for byte, with no network request and nothing from the live page.
cd "$(dirname "$0")/.." && P1=$(mktemp) && trap 'rm -f "$P1"' EXIT && cat src/head.html src/base.css src/extra.css src/body.html src/app1.js src/app2.js src/app3.js src/app4a.js src/app4b.js src/app4c.js src/app5.js src/app6.js src/app7.js \
  | sed -e "s/__WIDE__/$WIDE/g" | python3 tools/layout-css.py > "$P1" \
  && [ "$(grep -c '^@@APP_SRC@@$' "$P1")" = 1 ] \
  && { sed '/^@@APP_SRC@@$/,$d' "$P1"; sed -e 's/~/~0/g' -e 's/</~1/g' "$P1"; sed '1,/^@@APP_SRC@@$/d' "$P1"; } > index.html && wc -c index.html && bash tools/leak-check.sh
