# Corporate Affairs Intelligence System

Automated daily monitoring of regulatory, nutrition, dairy-industry, sustainability, and public-affairs sources — analyzed for corporate-communications relevance and delivered by email and a web dashboard.

## How it works

1. **A scheduled Claude cloud agent** runs every weekday morning. It follows [AGENT.md](AGENT.md): fetches every enabled feed in [sources.json](sources.json), dedupes (both exact URLs and same-story-different-outlet), keeps only items from reputable sources, and analyzes each story (summary, why it matters, category, risk level, comms relevance, recommended action).
2. The agent commits its results here:
   - `data/items/` — the permanent library of analyzed stories
   - `outbox/daily.md` — today's email body (Mondays also `outbox/weekly.md`, the previous week's greatest hits)
   - `docs/data.json` — data for the dashboard
3. **The push triggers [`.github/workflows/email.yml`](.github/workflows/email.yml)**, which emails the daily brief (and Monday weekly briefing) to the recipient configured in the `MAIL_TO` secret, via Gmail SMTP.
4. **GitHub Pages** serves `docs/` as the dashboard (`index.html`) and admin portal (`admin.html`). The portal (password-gated) edits `sources.json` / `config.json` directly in this repo, including how many extra sources the agent should auto-discover.

## One-time setup checklist

1. **Create this repo** (public) on GitHub and push these files.
2. **Enable Pages:** repo Settings → Pages → Source "Deploy from a branch" → branch `main`, folder `/docs`.
3. **Email secrets:** repo Settings → Secrets and variables → Actions → New repository secret:
   - `MAIL_USERNAME` — the Gmail address that will send the emails
   - `MAIL_APP_PASSWORD` — a Gmail **app password** for that account (Google Account → Security → 2-Step Verification → App passwords)
   - `MAIL_TO` — the recipient address for the daily and weekly emails
4. **Connect GitHub to Claude Code cloud** (claude.ai/code → settings) so the scheduled agent can clone and push this repo, then create the daily routine pointing at this repo with the prompt referencing AGENT.md.
5. **Admin portal token:** create a fine-grained personal access token (github.com → Settings → Developer settings → Fine-grained tokens) scoped to **only this repository** with **Contents: Read and write**. Paste it once into the admin portal (stored only in your browser).

## Security notes

- The admin-portal password is a client-side convenience gate, not real security; the portal only edits a public source list.
- The Gmail app password lives exclusively in GitHub Actions encrypted secrets. The portal token lives exclusively in your browser's localStorage. No credential is ever committed to this repo.
- The dashboard URL is public (unlisted). Content is analysis of public news.
