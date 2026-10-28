# Learnings

Each entry: what was found, the change made, and what to watch for.

## Keep the plan in the address bar until the Home Screen app has it
- **Found:** clearing `#p=` right after loading in a Safari tab would make Add to Home Screen save a bare address, and the Home Screen app starts with empty storage, so it would open with no plan.
- **Change:** a browser tab keeps the fragment. Only the standalone app clears it, after the plan is saved. Reopening the same link is a no-op, so the kept fragment is harmless.
- **Watch:** confirm on a real iPhone that the Home Screen icon opens with the plan, on each new iOS major version.
- **Device-verified (2026-10-24):** on an iPhone and on both screens of a folding phone, the Home Screen icon opened with the plan loaded, and a day logged in the Home Screen app survived closing and reopening it.

## The empty state needs its own scrolling rules
- **Found:** at 951x669 the app locks page scroll so the two panes scroll on their own. With no plan there are no panes, and the empty state was cut off.
- **Change:** `html.no-plan` restores page scroll, and the empty state becomes two columns on each side of the fold gap at 820px and wider.
- **Watch:** any new full-page state (errors, onboarding) on the wide layout.

## A prompt inside a closed sheet is invisible
- **Found:** on narrow phones the plan sits in a bottom sheet that starts closed, so a start date reminder placed there was never seen.
- **Change:** the reminder renders in the today pane.
- **Watch:** anything that must be seen on first open belongs in the today pane, not the sheet.

## Ask once per visit, however the plan arrived
- **Found:** the start date question came back after a reload when the plan came from a pasted code, because only the link flow set the "asked" flag.
- **Change:** the question sets the flag itself.
- **Watch:** flags set by one entry path that another path also needs.

## Test the codec on both paths
- **Found:** the stream decoder and the built-in inflater can disagree, and only old Safari uses the inflater.
- **Change:** the encoder's `--verify` decodes with the app's own code on both paths, and the codec test fuzzes the inflater against Node's zlib at every level and strategy.
- **Watch:** keep the inflater until the oldest supported iOS has `DecompressionStream("deflate-raw")`.

## An Undo toast needs reserved space, not a layer
- **Found:** on the phone test the floating toast covered the week strip and buttons.
- **Change:** on phones the toast is a row inserted above the strip in the bottom group (the group grows upward for the Undo window), or a row in the open page's header. The Undo window matches the visible time.
- **Reversed in v0.1.2:** v0.1.1 also ended Undo on any other tap. That meant checking Progress, or just opening Week and progress, threw Undo away. Now only the timer (10 seconds), the X, a swipe or the next status change end it, and the toast follows the page open and closed.
- **Watch:** a live toast must move with its host (bottom group or page header) whenever the page opens or closes. Since v0.1.2 inner screens use the same row above the strip, in the left pane, never a floating card over the header.

## iOS sends no click for a tap on plain text
- **Found:** a document click listener never saw taps on headings or paragraphs in mobile WebKit, so "tap anywhere" did not dismiss.
- **Change:** a still tap (pointer down and up within 10px) also dismissed. Removed in v0.1.2 with the tap-anywhere rule.
- **Watch:** any future "tap outside" behavior needs the same still-tap handling.

## Tabular figures widen hyphens in WebKit
- **Found:** `font-variant-numeric: tabular-nums` on the body gave hyphens in exercise names a figure-width gap in WebKit.
- **Change:** tabular figures only on numbers. The gate measures hyphens as text ranges, which WebKit rounds to whole pixels, so it allows 1px and flags any tabular setting on text with a hyphen.
- **Watch:** new number styles that are set on a parent of names.

## color-mix() is not safe for older phones
- **Found:** Safari before 16.2 drops a declaration that uses `color-mix()`, which left dark mode tokens empty.
- **Change:** every token is a fixed hex or rgba value, and the gate fails on any `color-mix`.
- **Watch:** other newer CSS functions in tokens.

## Test clocks can swallow errors
- **Found:** with Playwright's clock installed, an error thrown in a timer is caught and logged, so the page's error listener never sees it.
- **Change:** the crash panel gate throws from an event listener instead.
- **Watch:** any gate that relies on timers throwing.

## Keep the keyboard off the box the user should not need
- **Found:** on the inner screen the keyboard covered the Update plan box and its button.
- **Change:** Paste code is the main action and takes focus, so no keyboard appears. The box is pinned near the top and follows `visualViewport` when it is used.
- **Watch:** any input placed low on the page.

## Inner portrait is one column, but overlays still have a hinge
- **Found:** at 669x835 the Update plan panel used the full width, so its text and Paste code crossed the fold. The app content is one column there, but a fold is still in the middle.
- **Change:** from 600px up, every overlay (dialogs, Update plan, crash panel, Import confirm, toast) is the left pane's width. The flow gate measures every box and text run in each one.
- **Watch:** a new overlay needs to join the shared 600px rule in `extra.css` and the hinge section of the gate.

## Contrast is now measured, not eyeballed
- **Found:** no gate checked contrast, so dark-mode tokens on Week and progress and the error screen were only reviewed by eye.
- **Change:** the flow gate computes the WCAG ratio for every visible text element against its composited background, in dark and light.
- **Watch:** text on a gradient or image background is skipped (counted as skipped in the row detail); keep text on plain token colors.

## A dialog sized from the visual viewport can paint as a sliver
- **Found:** on a folding phone, both screens, Update plan first painted as a clipped title bar near the top, then the whole card. Both shots were taken just after a weigh-in was saved, so the keyboard was still closing.
- **Cause:** the panel's `max-height` came from `visualViewport.height` (`--vv-h`), set in the same frame the panel became visible, with `overflow-y: auto`. While the keyboard animates closed, the visual viewport reports a small, changing height, so the first frame was clipped to a sliver and later resize events grew it. The shared dialog did not use the visual viewport, but it had no first-frame guarantee either. Desktop test engines have no keyboard, so this is the most likely cause, not one reproduced on a device.
- **Change:** the panel follows the visual viewport only while its field has focus. Every dialog is laid out at full size before it shows, and only opacity and an 8px rise animate (200ms), never height, max-height, clip or overflow; the dim fades on the same frame. The flow gate samples every animation frame from the tap.
- **Watch:** retest on the phone right after saving a weigh-in. Any new size rule that reads the visual viewport must apply only while typing.

## A sticky box pins inside its scroller's padding

v0.1.2 pinned the left pane's group (Undo row, strip and Showing bar) with `position: sticky; bottom: 8px`. The pane is its own scroll container at 820px and up, and it had `padding-bottom: calc(24px + 50px + safe area)` as toolbar clearance. Sticky offsets are measured from the scrollport inset by the scroller's padding, so the group stuck about 82px above the screen edge, and the card scrolled visibly beneath it: Mark day done showed below the strip and the card looked split. The pinned group was also tall (Undo row, strip and Showing bar), which hid most of the exercises.

Fix: the pane has no bottom padding; the clearance is a spacer after the group (`#navEnd`), so the group pins flush with the bottom and an 8px page-background fill covers the gap below it. The strip pins alone, with the Undo row directly below it only while Undo shows, and the Showing bar follows in the flow. The group is `display: flow-root` and an empty `#navMark` right after it marks its place in the flow, so "pinned" is read without margin collapsing through the group. Lesson: never give a scroll container that holds a sticky footer a bottom padding; reserve space with an element after the sticky box. Scroll events inside a pane do not bubble, so listen with `capture: true`. A pane that scrolls on its own also needs its own `scroll-padding-bottom` (the pinned group height), or focus and scrollIntoView land a control under the strip; the page-level one on `html` does not apply inside the pane.

## Keep the end in view without fighting the reader

When a row grows while the reader is at the end, the end must stay in view in the same frame (a ResizeObserver runs after layout and before paint). The scroll the code sets fires a scroll event a frame later, when the row may have grown again; reading that event as "the reader left the end" stops the follow after one step. The observer holds its "at the end" state for 400ms after its own scroll. Away from the end (more than 24px), nothing moves.

## Mutation-test a layout gate

The clearance gate was checked by breaking the fix. Removing the reserved height (`--pin-pad`) fails the floating-Undo check at 669x835 and 700x1024 in both engines. Putting the toolbar clearance back as pane padding fails "nothing of the card beneath a pinned group" at 951x669 in all four states (today, another day, with and without Undo) in both engines. Disabling the end-follow fails "Undo raised at the end keeps the end in view" at 382x644, 669x835 and 951x669. Each was restored and the gate passes.

## Swap a row, do not add one

On the cover screen a toast added as a row grows the pinned group and covers more of the card, exactly when the reader is looking at it. Standing the toast in the place of a row that is already there (Back to today and Week and progress) keeps the group's height, so nothing moves and nothing new is covered. The cost is that the row's controls are out of reach for the toast's 10 seconds; the X gives them back at once. Measure the height before and after (within 1px), not by eye. The one exception is very large text, where a cut message is worse than a taller row.

The first cut stacked the toast over the row with `position: absolute; inset: 0`. It kept the height, but an absolute box is out of the flow: it cannot grow the row when the message wraps at 200% text, and it needed a script to measure and set a `min-height`. The fix puts the row's controls in a wrapper (`#navRow`) and makes `#outerNav` a one-cell grid with the wrapper and the toast both in that cell. The cell is as tall as the taller of the two, and the toast has no vertical padding, so it is no taller than the 44px row. Only opacity animates. Watch: anything that pads the toast, or a taller toast button, grows the cover group. The clearance gate measures this.

## A gate that ignores the page fill reports false overlaps

The pinned group paints an opaque page-background fill below itself (to the screen edge, safe area included). Content that scrolls under that fill is hidden, not "showing beneath the strip". The clearance check measures from the bottom of the fill, read from the `::after` box, not from a fixed 8px; a 34px safe area otherwise reads as a visible gap.

## Root cause: the inner pinned group overlapped the card

Two causes, both in how the left column ended. (1) Inner landscape (820px and up): the pane is its own scroller and carried the toolbar clearance as `padding-bottom`. A sticky footer pins inside the scroller's padding, so the group stuck about 82px above the edge and Mark day done scrolled visibly beneath it (see "A sticky box pins inside its scroller's padding"). (2) Inner portrait (600 to 819px): the page scrolls, the strip pins at 8px plus the safe area above the bottom, and the left column ended right after the strip's place in the flow. At the end of the column the strip's place was still that inset below the visible bottom, so it stayed pinned over the end of the card instead of returning to its place. The fix for (2) is an 8px-plus-safe-area spacer at the end of the column (`#navEnd`); for both, the strip pins alone, the Undo slot sits below it only while Undo shows, and the duplicate Showing bar is gone, so the pinned group can never sit between the exercises and Mark day done.

## Mutation tests for the v0.1.3 swap and padding

The final clearance gate (404 checks per engine) was broken three ways against a served copy of the built page, in WebKit and Chromium. Putting the cover toast back as an added row in the group fails 26 checks in each engine (group height with and without the toast, at 334, 382, 390 and 475 wide, in the Safari-height and swap sections). Zeroing the reserved space (`#navEnd` and the page's `--pin-pad`) fails 12 in each (max scroll overlap and end-follow at 669x751, the Safari visible height of 669x835; the strip back in its place at 669x835; the floating Undo at 669x835 and 700x1024). Positioning the toast absolutely over the row fails the normal-flow check (10 in Chromium). The real page passes all 404.

## A toast that takes another control's place is a regression, however smooth
- **Found (v0.1.3.1):** on the cover screen v0.1.3 crossfaded Undo in place of Back to today and Week and progress so the group kept its height. On the phone it read as Undo sitting on top of those buttons, and the page still nudged.
- **Change:** Undo has its own slot below the row, always reserved at the toast's full height; only opacity changes. The clearance gate checks no intersection with the row at every scroll stop, `elementFromPoint` on the row's buttons while Undo shows, and that scrollTop, the row and the strip do not move when Undo shows or goes.
- **Watch:** the reserved slot makes a pinned group taller even with no toast. If that costs too much card on short screens, shrink the slot (one line of message), never let the toast share space with a control.

## A pinned bottom group always covers the end of the card above it
- **Found (v0.1.3.2):** on the cover screen, a picked day's last exercises and Mark day done were hidden behind the strip, the row and the Undo slot, with about 100px of empty page below them. Root cause: the group was `position: sticky` at the bottom, and sticky-bottom pins exactly while the group's place in the flow (right after the card) is below the fold. So whenever it pinned, it sat over the end of the card. Its bottom offset (50px toolbar plus the 34px safe area plus 16px) also counted the toolbar twice at Safari visible heights, where the toolbar is already off the viewport. v0.1.3.1's always-reserved slot made the pinned group taller (about 191px), so it hid more.
- **Change:** nothing pins. The strip, the row and the slot follow the card in the flow, and picking a day scrolls just enough to show the whole card with the strip and the row below it (`revealCard()`). A card too tall for the screen shows from its top and scrolls. Undo keeps its reserved slot, so nothing jumps.
- **Trade-off:** with nothing pinned, the Undo slot can be below the visible bottom when Undo shows. Undo still never scrolls the page (a scroll on show reads as a jump), so picking a day brings the slot into view whenever the card and the group fit, and otherwise Undo waits in its slot a short scroll away.
- **Watch:** on the phone, whether an Undo below the fold after Skip or Done on a long card goes unseen. If it does, shorten the slot or move Undo into the card header. Never pin the group over the card again. The fit checks in `test/clearance.js` fail 165 per engine against v0.1.3.1 (55 at rest after picking a day, 110 in the 17-stop sweep: 55 cover, 75 inner portrait, 35 inner landscape).

## Pick the layout mode by width only (superseded in v0.1.3.3, see Slab phones are never two panes)
- **Found:** the inner screen in portrait (669 wide) got a squeezed two-section layout, and the cover screen in landscape (678 wide) got portrait rules, because the mode split sat at 600px. Tests at 600 to 819 had drifted from both real layouts.
- **Change:** one set of queries in `tools/build.sh`, substituted into every rule and `matchMedia` call. Everything below 820px uses the cover pattern. The size table is in the CHANGELOG and the build script.
- **Watch:** a new device between 679 and 950px wide. Never add height or aspect ratio to the mode query: a keyboard shrinks the viewport and would flip the layout mid-typing.

## A landscape layout set by aspect ratio must freeze while typing
- **Found:** the Counter needs "wider than tall", but on Android (and in test rigs) the keyboard makes a portrait viewport wider than tall. The import confirm also failed to close on a flip because a button blur started the typing hold.
- **Change:** `html.counter` is set in JS and frozen while a text field has focus and for 700ms after it blurs; only text fields start the hold. The sheet ignores orientation changes while a text field has focus.
- **Watch:** any new layout switch tied to orientation or height. Test the keyboard by focusing first and then shrinking the viewport, the order a real keyboard uses. Resizing first tests a turn, not a keyboard.

## One type scale, fitted to the longest day
- **Found:** sizing each day's card to fit made the text size jump from day to day, and a fixed size either clipped the long days or wasted the short ones.
- **Change:** `fitCounter()` measures every training day in each block or deload variant and takes the one largest scale that fits them all, with fixed floors (names 14px, sets 13px). Below the floor, the card scrolls inside itself.
- **Watch:** plans with very long days get small text in the Counter. Show the floors and the measured scale per sample in the gate summary.

## Dialogs belong next to the control that opened them
- **Found:** on the cover pattern every dialog opened at the top of the screen, far from the tap, and on the inner portrait a confirm could sit in the other half.
- **Change:** `placePop` puts it 8px above or below the control, clamped on screen and never above the top clear zone, and follows the visual viewport while typing. In the Counter the bottom toolbar zone is dropped (Safari's bars are on top in landscape) and Update plan is compacted so it fits whole.
- **Watch:** a new dialog must pass an `anchor` (or rely on a recent tap). Short landscape heights are where a dialog first stops fitting.

## Slab phones are never two panes
- **Found:** with width alone picking the mode, a landscape iPhone 14 (844x390) and every larger phone in landscape got the two-pane layout meant for the Duo's inner screen.
- **Change:** two panes and the inner density need a big device: the screen (`device-width`, `device-height`) at least 600px on its short side, with `html.duo-inner` set before first paint. Cover layouts are the phone layouts; landscape under 500px tall gets the Counter. The size table is in `tools/build.sh` and the CHANGELOG. Approved by the maintainer on 2026-10-25.
- **Why the screen:** it is the one size a keyboard cannot shrink, so the rule keeps "typing never flips the layout". In Playwright only the context's `screen` option drives the device queries; overriding `screen.width` in a script does not.
- **Watch:** a phone with a short side of 600px or more would get the inner layouts. The 16 Pro and Pro Max top inset is 62px, not 59; the gate uses real values.

## A gate for text size needs a definition of reading text
- **Found:** a 15px floor flagged labels, footers and exercise names along with real paragraphs, and text-rect overlap flagged stacked line boxes that only touch.
- **Change:** reading text is a run of words (25 characters or more); field labels, footers, the About footer and exercise names are small print. An overlap counts only past a quarter of the smaller box. Raised the reading text to 15px in the cover pattern only, so the two-pane rects stay identical.
- **Watch:** new paragraphs in the cover pattern need the 15px floor.

## Undo stays where the card puts it, even on a slab phone
- **Found:** on Android and the larger iPhones, Undo after Skip can sit below the fold, because the cover pattern never scrolls on show (see A pinned bottom group always covers the end of the card above it).
- **Change:** none to the app. A scroll-on-show was tried and reverted because it contradicts that decision. gate-slab records where Undo shows below the fold and checks it after scrolling it in.
- **Watch:** on a real phone, whether people miss Undo after Skip.

## A copy of the page must come from the build, not the page
- **Found:** serializing the live DOM would carry the user's state and any injected markup into the copy.
- **Change:** the build embeds the shipped file in itself (two passes, an escape that cannot close the script), and Get your own copy writes those bytes back with a Blob. gate-about compares the download byte for byte and fails on any request.
- **Watch:** any build step after the embed would make the copy differ from the file; the embed must stay the last step.

## The reported screen size is not the screen you are on

Finding: on a real folding phone, the browser kept reporting the cover screen's size after unfolding, so layout picked from `device-width` showed the cover layout on the inner screen. Emulators never reproduce this because they report what they emulate.
Change: layout comes only from the page's own size (short side at least 520 for the inner layout), as classes set by script, re-checked on resize and unfold and frozen while typing. The About page shows the window size next to the reported screen size.
Watch for: any new rule that reads `screen.*`, `device-width` or `visualViewport` for layout. Gate it with a misreported screen and with a folded-then-unfolded page.

## Two panels read as one surface only if everything lines up

Finding: a card that ends early next to a list that runs to the bottom, plus a link floating above the list, looked lopsided even though each part met its own rules.
Change: both panels fill the same height on one surface, both headers share one height and one label style, actions are pinned to the bottom, and both panels share one type scale.
Watch for: a new element in one panel's header or footer without a matching slot in the other.


- **Timers that compare against `Date.now()` freeze under a fixed test clock** (v0.1.3.3). The layout hold after a field blurs never expired in the gates because the test context pins `Date`. Change made: time short UI holds with `performance.now()`. Watch for: any new hold or debounce; use the monotonic clock.
- **Emulate the keyboard in the order it happens** (v0.1.3.3). Focus first, then shrink the window. A page loaded at the short height is a different device under a window-based layout rule.
- **An opaque pinned footer over a scrolling card hides content behind blank space** (v0.1.3.4). With the whole card as the scroller, the sticky actions bar (and its reserved, usually empty Undo slot) covered the rows, so at 200% text the card showed one line and a blank band. Change made: scroll the list itself between the fixed header and the actions, and say how many rows are hidden with a solid "N more" button. Watch for: any sticky or reserved area over scrolling content; measure what is actually visible, not what is reachable.
- **`min()` with `max-content` is not valid in `min-height`** (v0.1.3.4). WebKit drops the whole declaration and computes 0, with no error. Read back computed styles after writing a new CSS function form.
- **An oversized snap area does not snap** (v0.1.3.4). A row taller than its scroll window, given `scroll-snap-align: start`, lets WebKit and Chromium stop anywhere inside it (the spec's "covers the snapport" rule), so mandatory snap still left a line cut at the top. Change made: snap points on things no taller than the window (a 1px row-top marker and each line's first word), and a line-height at least the font's content height. Watch for: snap on any element that can grow past its scroller; check with a scroll that settles at arbitrary offsets in both engines.
- **A CSS size container can break scroll anchoring elsewhere in WebKit** (v0.1.4). Making the week list a `container-type: inline-size` container, so one column could follow the list's own width, made WebKit jump the other pane's scroll when a day opened at 951x669. Change made: measure the list with a ResizeObserver and set a class. Watch for: `container-type` on anything inside a scroller; test the other pane's scroll after a size change in WebKit.
- **A re-render that rebuilds a list must restore the scroll itself** (v0.1.4). Opening one day and closing another re-renders the whole week; without restoring `scrollTop`, cards above the tap moved. Change made: keep the pane and window scroll across the render, then correct only a top that left the view. Watch for: any `innerHTML` re-render inside a scroller.
- **A sticky page head needs matching scroll padding** (v0.1.4). `scrollIntoView` and keyboard focus put a control at the scroller's top edge, under a sticky head. Change made: the pane's `scroll-padding-top` is the head's measured height. Watch for: every scroller with a sticky header.
- **A reserved slot for a rare message costs space every time** (v0.1.4). The Counter's empty Undo slot cost a whole row at 100% text on the cover screen in landscape. Change made: Undo overlays the bottom of the list (opacity only) and the pill hides under it, so at the 06 size all 5 rows fit. Watch for: reserved space for transient UI; overlay it where nothing is lost, and gate that it never moves the content.
- **A "fits or not" card needs a ladder, and the ladder needs an end** (v0.1.4). Up next must never make the home scroll, so it steps down from whole to 3 rows, the title block and one line, then hides. Watch for: the last rung is a design question (at 669x751 with 200% text nothing fits); decide it in the spec, not in code.
- **"Script error." means the error was not ours** (v0.1.4). On a live iPhone, opening Safari's page menu showed the crash panel with only "Script error.". Browsers mute errors from cross-origin script to that string, with no file and line 0. Every script in this page is inline and the CSP loads nothing else, so the source was script Safari or an extension injected (the menu's Hide Distracting Items and similar features run on the page). A probe of the Today view in WebKit (the window shrinking and growing as the menu and toolbar move, tab hide and show, pagehide and pageshow, focus changes) gave no error in v0.1.3.4 or v0.1.4, while a dispatched muted error reproduced the panel exactly. Change made: the panel shows only for an error object with a stack or a file on this origin; muted errors are counted in About. Watch for: a global error handler must filter by attribution, not by message text; and Playwright's clock swallows errors thrown in timers, so throw from a real event handler in a gate.
- **Two workers in one tree** (v0.1.4). An earlier builder's task was interrupted but its gate lanes kept running, and a second builder started in the same tree, so both edited `src/` and the NOTES file and each other's test runs read a half-changed build. Change made: one builder, named in NOTES, and the other's lanes stopped before any edit. Watch for: before taking over a tree or a NOTES file, check for live processes (`ps` for node and gate lanes) and recent file mtimes; if another writer is active, stop and ask rather than edit.

## Baseline alignment is not enough when a list snaps to lines

Aligning the sets on the name's first-line baseline looked right in every static shot, but the sets' monospace glyph box is deeper than the name's, so it reached 3px into the name's second line. The Counter's list snaps to each line, and a snap to that second line cut the sets at the top. Where rows can scroll to a line boundary, check that nothing from one line reaches into the next; top-aligning the sets in the snapping list fixed it.

## An overlay that was safe because of reserved space is not safe once the space goes

v0.1.3.4 reserved the Undo slot at the top of the Counter's actions bar, so the toast could never sit over a row. Spec (c) gave that height back to the list and let the slot overlay the list's bottom "opacity only"; the main Counter gates checked the pill and the walk but no gate except gate-slab looked at text under the toast, and only in short landscape. When a change removes reserved space, list every overlay that relied on it and check text under each one. Reserving the space only while the overlay shows keeps both: no layout cost when it is hidden, no covered text when it shows. And a line height below the font's glyph box is invisible until a scroll edge cuts the next line to a sliver. Padding is part of an element's minimum size: a scroll list that keeps its end room as padding-bottom can't shrink below that padding, so "give the height back" silently did nothing at 200% until the room moved to a spacer (::after) inside the scroller.
