# FitTrack

Mobile-first, offline fitness tracker (React + Vite + TypeScript + Tailwind + Recharts).
All data is stored in your browser's `localStorage` on the device — no backend, no login.
Installable as a PWA.

## Screens
- **Today** — auto-picks today's workout + meals as tickable checklists, kcal/protein running totals, water (+250 ml, 3 L target), sleep hours, *Mark day complete*. Use ‹ › to backfill earlier days.
- **Plan** — all 7 days; tap **Edit** to change titles, exercises, meals, kcal and protein.
- **Progress** — weight log + weekly averages + chart, waist log (every 2 weeks) + chart, run log with automatic pace.
- **Goals** — week-by-week checklist; the current week is highlighted from your start date.
- **Settings** — start date, water target, export/import JSON backup, reset.

Streaks and the "never miss two in a row" warning show on Today. If your weekly average weight drops faster than 0.5 kg/week you'll see "Add food to protect muscle."

## Run it

Requires Node 18+.

`npm run build:single` builds the whole app as one self-contained `dist-single/index.html` (no service worker), for hosting as a single page.

```bash
npm install
npm run dev        # http://localhost:5173 (add --host to open it from your phone on the same Wi-Fi)
npm run build      # production build into dist/
npm run preview    # serve the production build at http://localhost:4173
```

## Install on your phone

The service worker (offline mode + install) only works over **HTTPS** (or `localhost`),
so host the built `dist/` folder somewhere with HTTPS. Any static host works, e.g.:

- **Netlify Drop**: run `npm run build`, then drag the `dist` folder onto https://app.netlify.com/drop
- **GitHub Pages / Vercel / Cloudflare Pages**: build command `npm run build`, output directory `dist`

(The app uses relative paths, so it works from a sub-path like `username.github.io/jay/`.)

Then on your phone, open the URL once and:

- **iPhone (Safari)**: Share button → **Add to Home Screen** → Add.
- **Android (Chrome)**: ⋮ menu → **Install app** (or **Add to Home screen**).

Open it from the home-screen icon; it runs full-screen and works offline after the first load.

## Your data

Data lives only in that browser on that device. Installing the PWA on iPhone gives it its own storage,
separate from Safari, so log from the home-screen app. Use **Settings → Export JSON** regularly
as a backup, and **Import JSON** to restore it or move to a new phone.
