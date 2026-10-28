# Workout tracker

> Your plan and logs stay in this browser's storage on this device. Nothing leaves it unless you export or share your link.
> No accounts and no analytics. This site only delivers the blank page, and your plan fills it in right here.
> Your plan lives after the # in your link. Browsers never send that part to the server.
> Clearing site data, or closing a private window, deletes your plan and logs. Export now and then to keep a backup.

One web page that works like an app on a phone. It shows today's session, marks training days done or skipped, logs top sets and body measurements, and shows progress. It adapts to a regular phone, both screens of a folding phone, split screen and a tablet, in light and dark mode.

It holds no plan and no personal data. A coach (or you) sends a link with the plan inside it. The plan and everything logged stay in the browser's storage on that one device. The page makes no network requests.

## Use it

1. Write a plan as JSON. See [PLAN-SCHEMA.md](PLAN-SCHEMA.md) and the five plans in [samples/](samples/).
2. Check it and make a link:
   ```sh
   node tools/encode-plan.js --verify my-plan.json --url https://YOU.github.io/tracker/
   ```
3. Open the link on the phone. On an iPhone, use Safari, then **Share**, **Add to Home Screen**, **Add**. Open the new icon and use it from then on. Android tip (optional; the link works fine in the browser): in Chrome, tap ⋮, then **Add to Home screen**, then **Create shortcut** (or **Install** if offered). Samsung Internet: **Add page to** > **Home screen**. Edge: **Add to phone**.
4. The tracker asks for the start date on first open. Week 1 starts on the Monday of that week.

The tracker always opens on the current calendar week. If last week still has open sessions, one line says how many, with **Stay on week N** (kept for this visit only) and **Push my plan back a week** (moves the start date 7 days later after a confirm; every log stays). Before the start it previews Week 1, and after the last week it says the plan is complete.

To change the plan later, send the code that `tools/encode-plan.js` prints (the part after `#p=`). On the phone: copy it, then **More**, **Update plan**, **Paste code**. If the browser does not share the clipboard, paste into the box and tap **Use this plan**. Logged days and top sets stay. Removed days and lifts are kept, not shown or marked Archived, and the change can be undone for 10 seconds.

**Back up weekly** with **More**, then **Export**. **Import** restores an export after a warning and a confirm, with 10 seconds to Undo.

## Run your own copy

`index.html` is the whole app and is committed built. About 5 minutes:

1. Fork this repo, or download `index.html` (in the app: **More**, **About and your data**, **Get your own copy** saves the same file as `coach-tracker.html`, with no plan and no data in it).
2. In your fork, open **Settings**, **Pages**, and deploy from a branch: `main`, folder `/ (root)`. `.nojekyll` stops Jekyll from processing it.
3. Open the address GitHub shows (it has the form `https://<your-name>.github.io/<repo>/`, for example `https://rtiller.github.io/coach-tracker/`) and send yourself a plan link for it.

Any static host works the same way, or open the file straight from your device. Only `index.html` needs to be served.

A new address starts empty. Use **Export** on the old address first, then **Import** on your copy.

The code stays public even if maintenance stops.

## The link and the Home Screen

- The plan rides in the link fragment (`#p=...`). Browsers never send the fragment to the server, so the host never sees the plan.
- Opened in a browser tab, the tracker loads the plan and **keeps** the fragment in the address bar. That is on purpose: on iPhone, Add to Home Screen saves the address shown at that moment, and the Home Screen app starts with its own empty storage, so it needs the plan in its start address.
- Opened from the Home Screen (standalone), the tracker clears the fragment once the plan is saved, so a reload never re-applies it.
- Opening the same link again does nothing. A link with a different plan on a device that already has one asks first, and keeps the old plan if declined.
- On iPhone, Safari and the Home Screen app keep **separate** data. Use the icon.
- **Device-verified (iPhone, 2026-10-24):** the Home Screen icon opened with the plan loaded, and a day logged in the Home Screen app was still there after closing and reopening it. The same held on the inner screen of a folding phone.
- The link is not secret. Anyone who has it can open the plan, so send it only to the person it is for. Logged data never travels in the link.

## Storage

All localStorage keys start with `ct1-` (storage schema 1): `ct1-schema`, `ct1-plan`, `ct1-seen`, `ct1-week`, `ct1-startDate`, `ct1-done`, `ct1-openDays`, `ct1-lifts`, `ct1-body`, `ct1-tab`, `ct1-progView` and `ct1-weekNoteHidden` (added in v0.1.2: the week whose leftover line was closed with its X; removed when the week changes, and not part of Export). Keys and value shapes never change within schema 1; a new key may be added, never renamed or reshaped. Logged days are saved as `w<week>-<day key>`. UI-only memory (the day being viewed) lives in sessionStorage. A browser that has not been used for a while (Safari on iPhone may clear site data after about seven days without a visit) can lose everything, which is why Export matters.

Storage belongs to the exact site address (scheme, host and port). Moving the tracker to a new address starts with empty storage there: Export on the old address first, then Import on the new one.

If something breaks while loading, a small panel offers **Download raw data** (every `ct1-` key exactly as stored) and **Reload**. The empty and read-only screens offer **Export** whenever saved data exists. An Import that does not fit in storage is rolled back and says so.

The page sets a Content Security Policy (`default-src 'none'`, inline script and style only, `data:` images). It cannot load or send anything.

## Link codes

`tools/encode-plan.js` has no dependencies (Node 18 or newer). It checks a plan with the tracker's own validator, then compresses it with raw DEFLATE (level 9) and base64url. The tracker decodes with the browser's `DecompressionStream` and falls back to a small built-in inflater on browsers without it (Safari before 16.4). It also reads gzip, zlib, plain base64url JSON and pasted JSON.

```sh
node tools/encode-plan.js plan.json [--url URL] [--gzip] [--json]
node tools/encode-plan.js --verify plan.json [--url URL]
node tools/encode-plan.js --decode CODE_OR_LINK
node tools/encode-plan.js --check plan.json
```

## Build

Edit `src/`, then run `tools/build.sh`, which concatenates it into `index.html`. Commit both.

## Test

Tests use Playwright (not a dependency of the app). Put a `node_modules` with `playwright` in `test/` or install it there.

```sh
node test/codec-test.js                      # encoder and decoder, inflate fuzz
node test/gate-layout.js webkit [URL]        # taps, 44px targets, fold, safe zones, every size
node test/gate-behavior.js chromium [URL]    # link flow, update, import, errors, samples
node test/gate-flow.js webkit [URL]          # start prompt, bad link, toast, sheet, Update plan, week, safety net, CSP
node test/gate-v0133.js webkit [URL]         # cover / Counter / inner layouts, type scale, dialogs attached to their control
node test/gate-about.js webkit [URL]         # About page, Get your own copy byte for byte, zero requests, issue forms
node test/gate-slab.js webkit [URL]          # single-screen phones: iPhone and Android sizes, notch and home-indicator insets
```

The clock is pinned to `2026-10-23T12:00:00-05:00` (override with `GATE_NOW`). Sizes: 390x844, 430x932, 382x644, 669x835, 951x669, 475x669, 334x835, with top insets 0, 47 and 59. Without a URL the gates serve this folder on a free local port.

## Source code

https://github.com/rtiller/coach-tracker

## Support and contributions

Report bugs or request features through GitHub Issues. Provided as is, with no support guaranteed.

Contributions come through issues, not pull requests: describe the change in an issue. Please remove personal, health and plan data before posting. Security problems go through private vulnerability reporting; see [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
