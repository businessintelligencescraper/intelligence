# Brand Monitoring — Playbook

This is the **second, separate** monitor. It does not replace or modify the industry
intelligence pass in `AGENT.md`, and it writes to different files.

The two answer genuinely different questions, which is why they are kept apart:

| | Industry intelligence (`AGENT.md`) | Brand monitoring (this file) |
|---|---|---|
| Question | What external developments could affect the business? | What is being said about us and our brands? |
| Trigger | A development anywhere in the category | A named brand actually appearing in coverage |
| Sources | `sources.json` — topic and policy monitors | `sources-brands.json` — a fixed list of named outlets |

**Never merge the two.** Industry items go to `data/items/`; brand mentions go to
`data/brand-items/`. A story can legitimately appear in both — the FDA proposing a
labelling rule is an industry item; a report naming Président in that rule is also a
brand mention. Record it in both, written for its own audience.

## Run sequence

1. Read `brands.json` and `sources-brands.json`.
2. For each **enabled** brand, search the enabled outlets for recent coverage naming it.
   Use the outlet's `url` (a search monitor scoped to that publisher) combined with the
   brand's `aliases`. Cover the last `config.lookback_hours` hours.
3. **Confirm the brand is genuinely the subject**, using `brands.json`:
   - If the brand has `must_include`, at least one of those terms must appear in the
     article. "Oui" or "Arz" or "Black Diamond" alone is almost never our brand.
   - If the brand has `not`, reject the known confusions outright — *President's Choice*
     is not Président; the *Cracker Barrel* restaurant is not our cheese; *Kraft Heinz*
     corporate news is not Kraft Natural Cheese; *Black Diamond Equipment* is not cheddar.
   - When you cannot tell whether it is really our brand, **drop it**. A false positive
     in brand monitoring is worse than a miss — it erodes trust in the whole feed.
4. **Dedupe** exactly as the industry pass does: against `data/seen.json` by URL, and at
   story level across outlets. The same wire story in five local papers is **one** mention
   listing five outlets, not five mentions.
5. **Apply the staleness guard** from `AGENT.md` unchanged — real publication date from
   hard evidence, nothing older than `config.max_story_age_days`.
6. **Analyse** each mention (below).
7. Write outputs (below). **Do not write anything to `outbox/`.**

## What to record per mention

Use the **same `risk` and `comms_relevance` rubric as `AGENT.md`** — the definitions do not
change just because the subject is a brand. Add the brand-specific fields:

- **brands** — array of brand `id`s genuinely referenced. Usually one.
- **outlet / tier / market** — from the source: `National`, `Trade`, or `Local` plus the
  market for local coverage (e.g. `Murfreesboro, TN`).
- **tone** — `Positive` / `Neutral` / `Negative`, judged on how the coverage reflects on
  the brand, not on whether the news is cheerful:
  - `Positive` — favourable: an award, a successful launch, positive review, supportive quote.
  - `Neutral` — factual or passing: a market report listing us, a routine business item,
    a name-check in a wider piece. **Most mentions are Neutral.**
  - `Negative` — unfavourable: recall, complaint, lawsuit, criticism, unflattering comparison,
    adverse claim. Judge the *coverage*, not the underlying event.
- **prominence** — `Featured` (the piece is about us) / `Mentioned` (we appear in passing).
- **summary, why_it_matters, recommended_action, sources, date, date_evidence, first_seen,
  id** — exactly as in `AGENT.md`.

Be unspectacular, as in the industry pass. Most coverage is Neutral/Mentioned/Low risk, and
the feed is only useful if that stays true.

## Outputs

### `data/brand-items/YYYY-MM.jsonl`
Append one JSON object per mention. Never rewrite past lines.

### `docs/brands.json` (overwrite every run)
```json
{
  "generated_at": "ISO-8601 UTC",
  "brands":  [ ...contents of brands.json, so the page can label and filter... ],
  "markets": [ "Buffalo, NY", "Chicago, IL", ... ],
  "items":   [ ...every brand mention ever recorded, newest first_seen first... ]
}
```

### No email
Brand monitoring sends **no email at all** at present — it is in testing. Do not create or
modify `outbox/alert.md`, `outbox/weekly.md`, or any other file under `outbox/`. The industry
pass owns those files exclusively.

## Quiet runs

As with the industry pass, **most runs will find nothing new, and that is correct.** If this
run produced no new mentions, make no commit and stop.
