# Plan format (schema 1)

A plan is one JSON object. The tracker reads it from a link (`#p=<code>`) or a pasted code, checks it, and stores it on the device. The machine-readable version of this page is [`plan.schema.json`](plan.schema.json). The tracker's own check (the same code `tools/encode-plan.js` runs) is the final word: it also enforces the cross-field rules that JSON Schema cannot express, listed under [Rules the schema file cannot check](#rules-the-schema-file-cannot-check).

Leave out names, birthdays, start dates and anything else personal. The tracker asks for the start date on first open.

## Example

```json
{
  "schema": 1,
  "meta": { "name": "Upper lower, 12 weeks", "weeks": 12, "blockWeeks": 4, "deload": "last", "units": "lb",
            "deloadNote": "Same weights, about half the sets.", "notes": "Optional text shown in a Notes card." },
  "days": [
    { "key": "upperA", "label": "Upper A", "short": "Mon", "focus": "Press focus", "priority": true },
    { "key": "lowerA", "label": "Lower A", "focus": "Squat focus" },
    { "rest": true, "note": "Easy walk" },
    { "key": "upperB", "label": "Upper B" },
    { "key": "lowerB", "label": "Lower B" },
    { "rest": true },
    { "rest": true }
  ],
  "blocks": {
    "1": {
      "upperA": [ { "name": "Bench press", "sets": "4 x 5-7", "tags": ["anchor"] }, { "name": "Lateral raise", "sets": "2 x 12-15", "tags": ["accessory"] } ],
      "lowerA": [ { "name": "Back squat", "sets": "4 x 5-7", "tags": ["anchor"] } ],
      "upperB": [ { "name": "Barbell row", "sets": "4 x 6-8", "tags": ["anchor"], "note": "Pause at the chest." } ],
      "lowerB": [ { "name": "Romanian deadlift", "sets": "3 x 8", "tags": ["anchor"] } ]
    },
    "2": { "...": "every training day again" },
    "3": { "...": "every training day again" }
  },
  "lifts": ["Back squat", "Bench press", { "id": "rdl", "name": "Romanian deadlift" }],
  "labels": { "anchor": "Main lift", "priority": "Focus", "optional": "If time", "hints": { "lowerA": "Warm up with two lighter sets." } }
}
```

Full working plans are in [`samples/`](samples/).

## Fields

### `schema`
Optional whole number, default 1. A plan with a higher number than the tracker reads shows "This plan needs a newer tracker" and changes nothing.

### `meta`
| Field | Required | Rule |
| --- | --- | --- |
| `name` | yes | Text, 1 to 80 characters. Shown as the plan title and in the replace question. |
| `weeks` | yes | Whole number, 1 to 52. |
| `blockWeeks` | no | Whole number, 1 to `weeks`. Default `weeks` (one block). Block N covers weeks `(N-1)*blockWeeks+1` to `N*blockWeeks`. |
| `deload` | no | `"last"` (the last week of every block), `"none"` (default), or a list of week numbers. |
| `deloadNote` | no | Text up to 300 characters, shown on deload weeks. |
| `units` | no | `"lb"` (default) or `"kg"`. Weigh-ins and top sets use it. Lengths use in with lb and cm with kg. |
| `notes` | no | Text up to 1500 characters, shown in a "Notes from your coach" card. |
| `start`, `startDate` | never | Not allowed. The tracker asks the person. |

### `days`
Exactly seven entries, Monday first. Each is a training day or a rest day.

| Field | Training day | Rest day |
| --- | --- | --- |
| `rest` | `false` or left out | `true` |
| `key` | Required. 1 to 32 letters, digits, `-` or `_`, unique in the plan. This is the stable id that logged days are saved under. | Optional, default `"rest"`. |
| `label` | Required, 1 to 40 characters | Optional, default "Rest" |
| `short` | Optional, up to 4 characters, default the weekday (Mon to Sun) | same |
| `focus` | Optional, up to 80 characters | not shown |
| `priority` | Optional `true` shows the Focus tag | ignored |
| `note` | Optional, up to 120 characters | Optional, shown on the rest day |

### `blocks`
An object keyed `"1"` to `"N"`, where N is `ceil(weeks / blockWeeks)`. Every block lists every training day key, and nothing else. Each day is a list of 1 to 20 exercises:

| Field | Required | Rule |
| --- | --- | --- |
| `name` | yes | Text, 1 to 80 characters |
| `sets` | yes | Text up to 60 characters, like `"3 x 8-10"` or `"3 x 30s"` |
| `tags` | no | A list from `anchor`, `priority`, `optional`, `accessory`. Exactly one exercise per day has `anchor`. |
| `note` | no | Text up to 160 characters, shown under the exercise |
| `id` | no | 1 to 40 letters, digits, `-` or `_`. Optional stable id for the exercise. |

### `lifts`
Optional list of up to 20 lifts the person logs top sets for. Each entry is a name (`"Back squat"`, id `back-squat` made from the name) or `{ "id": "...", "name": "..." }`. Logged top sets are saved under the id, so keep an id the same across plan updates. If the list is empty or left out, the tracker offers each anchor exercise once.

### `labels`
Optional. Renames the four tags (1 to 20 characters each; defaults Main lift, Focus, If time, Accessory). `labels.hints` maps a training day key to a short tip (up to 240 characters) shown on that day.

Unknown top-level fields and unknown fields inside `meta`, days and exercises are ignored. Unknown keys inside `blocks`, `labels` and `labels.hints` are errors, because they are almost always typos.

## Rules the schema file cannot check
- `days` has at least one training day, and training day keys are unique.
- `blockWeeks` is at most `weeks`; deload week numbers are at most `weeks`.
- `blocks` has exactly the blocks 1 to N, and each block has exactly the training day keys.
- Exactly one `anchor` per training day in every block.
- Lift ids are unique.

## How plan updates map data
Logged days are saved as `w<week>-<day key>` (for example `w5-lowerA`), and top sets carry the lift id. When a person pastes a new plan with **More, then Update plan**:
- A day that keeps its `key` keeps its marks, even if it moves to another weekday.
- A day key that disappears keeps its saved marks, but they are not shown or counted. If the key comes back, they show again.
- A lift that leaves `lifts` keeps its top sets, shown with an "Archived" label.
- A plan with fewer weeks moves the current week to the new last week. Nothing is deleted.
- The change can be undone for 10 seconds.

## Links and codes
The code is the plan JSON, compressed with raw DEFLATE (`deflate-raw`), then base64url without padding. The link is `https://rtiller.github.io/coach-tracker/#p=<code>`. The tracker also reads gzip, zlib, plain base64url JSON (no compression), standard base64, a whole pasted link, and the plan JSON itself. Limits: 40,000 characters of code, 200,000 bytes of plan JSON.

Use `node tools/encode-plan.js plan.json --url https://rtiller.github.io/coach-tracker/` to check and encode, and `--verify` to decode it again with the tracker's own decoder.
