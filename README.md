# Lede.nyc

**Urban intelligence for New York City residents.**

Lede.nyc is a mobile-first civic data app that turns raw NYC municipal data — DOB permits, HPD complaints, 311 signals, transit incidents — into a daily neighborhood briefing you can actually act on. Not a news feed. Not a map. A decision engine.

---

## What it does

The app opens with a single verdict for your area: **CALM**, **WATCH**, or **FRICTION** — then shows you the three signals driving it. From there you can drill into:

- Construction and scaffolding pressure in your borough
- Heat, hot water, and noise complaint patterns
- Transit reliability near you
- Building-level risk history (HPD/DOB violations)

Everything is scoped to your neighborhood first. A Bronx resident sees Bronx signals. A Queens resident sees Queens signals. The app never defaults to Manhattan.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Data | NYC Open Data via BigQuery |
| Auth | NextAuth.js (Google OAuth) |
| Maps | HTML Canvas (custom permit renderer) |
| Hosting | Vercel |

---

## App structure

```
src/
├── app/
│   ├── page.tsx              # Homepage — verdict → vibe → mood → feed
│   ├── atlas/                # Permit map (canvas-based, all 5 boroughs)
│   ├── transit/              # Subway + bus reliability
│   ├── diligence/            # Building risk + lease due diligence
│   ├── search/               # Address search
│   └── onboard/              # Borough + zip setup
│
├── components/
│   ├── NeighborhoodVerdict   # Hero: CALM / WATCH / FRICTION + 3 signal chips
│   ├── VibeCard              # 3-axis vibe vector (Growth / Disruption / Friction)
│   ├── BlockMoodCard         # 7-day permit activity vs 30d baseline
│   ├── DailyBriefCard        # TTS-enabled daily briefing card
│   ├── TransitCard           # Subway signal summary
│   ├── FeedSection           # Borough-first feed with resident question framing
│   ├── Atlas3DMap            # Canvas permit map with filter + click-to-inspect
│   └── ...
│
├── context/
│   └── NeighborhoodContext   # User borough + zip profile (localStorage)
│
└── data/
    ├── feed.json             # Daily briefing payload (generated at 6am ET)
    ├── permits-geo.ts        # Real DOB permit data with lat/lng
    └── trend-data.ts         # Sparkline trend values
```

---

## Key design decisions

**Borough-first everywhere.** The `NeighborhoodContext` stores the user's borough and zip from onboarding. Every component that displays data — the verdict, vibe vector, feed sort order — reads from this context and prioritizes local signals. There is no Manhattan default.

**One verdict, three chips.** The homepage hero answers one question: what is the state of my area right now? The verdict (`CALM` / `WATCH` / `FRICTION`) is backed by three specific signal chips — heat/water risk, noise pressure, construction burden — so the conclusion is always explainable.

**Resident questions, not taxonomies.** The feed section labels are written as questions residents actually ask: *Can I sleep this week? Is my building OK? Will my commute break? Why is the sidewalk cursed?* Each maps to underlying data categories (noise complaints, HPD violations, transit incidents, scaffolding permits).

**Time is first-class.** The Vibe Vector supports 7d / 30d / 365d toggle on every axis. A ghost tick shows the previous period's position so you can see direction at a glance without reading numbers.

**No Google Maps trap.** The Atlas uses a pure HTML Canvas renderer — borough outlines, grid, and glowing permit markers in the emerald/amber/rose triad. No API key, no Map ID, no blank screens.

---

## Data pipeline

The daily briefing runs at 6am ET via a scheduled script (`daily-lede.sh`) that:

1. Queries `lede-nyc-data.civicdata.dob-permits` in BigQuery
2. Detects anomalies (>25% above 90-day rolling average by borough)
3. Translates raw permit data into briefing card payloads
4. Writes to `src/data/feed.json`
5. Triggers a Vercel redeploy

Current data sources: NYC DOB Permits. Planned additions: HPD complaints, 311 noise reports, MTA incident feeds.

---

## Running locally

```bash
npm install
cp .env.local.example .env.local   # add your keys (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The onboarding flow will prompt for borough + zip on first visit.

**Environment variables:**

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # optional — canvas fallback works without it
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Roadmap

**Now**
- [x] Borough-aware verdict + vibe vector
- [x] Resident question feed framing
- [x] Canvas permit map (all 5 boroughs)
- [x] 7d / 30d / 365d time toggle on vibe axes
- [x] TTS-enabled daily briefing

**Next**
- [ ] Building Risk Receipt — address-first HPD/DOB signal panel
- [ ] Lease Due Diligence report — shareable PDF export
- [ ] Quiet Hours Forecast — tonight + weekend, math not editorial
- [ ] Real 311 complaint feed integration

**Later**
- [ ] Pro tier ($9–15/mo) — 12-month address history, alerts, export
- [ ] Neighborhood Stability Score — for moving decisions
- [ ] Commute Reliability Score — origin to destination
- [ ] B2B: white-label dashboards for tenant associations and community boards

---

## License

MIT. Built for New York City residents who want their city to make sense.
