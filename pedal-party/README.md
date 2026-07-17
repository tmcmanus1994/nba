# Pedal Party — Website Prototype

Working prototype of pedalparty's single-page site, built to the spec in the
build guide. Plain HTML/CSS/JS, organized one block per page section so each
maps 1:1 to a future Framer section.

## Run it

```bash
cd pedal-party
python3 -m http.server 8123
# → http://localhost:8123
```

(Any static server works; ES modules require http://, not file://.)

## Layout

| Path | What |
|---|---|
| `index.html` | All 10 sections, banner-commented, semantic HTML |
| `css/styles.css` | Design tokens (§3 of the guide) + per-section styles |
| `js/rideState.js` | **Isolated CMS module** — Google Sheet fetch, CSV parse, Central-Time 5-state machine. Ports to a Framer code component verbatim. |
| `js/main.js` | One init function per section: GSAP/Lenis motion, state renderers, form, config constants (`FORM_ENDPOINT`, `GALLERY_PHOTOS`) |
| `SHEET_SETUP.md` | Plain-English Google Sheet instructions for Dom |
| `assets/` | Logo-derived OG card, generated "RIDE PHOTO" placeholders, sample announcement image |
| `vendor/`, `fonts/` | GSAP 3.12.5, ScrollTrigger, Lenis 1.1.18, Baloo 2 + Figtree woff2 (all local, no CDN) |
| `shots/` | Verification screenshots (every section, all 5 ride states, mobile, interactions) |

## Wiring the real content

1. **Google Sheet**: follow `SHEET_SETUP.md`, then paste the published CSV
   link into `SHEET_URL` at the top of `js/rideState.js`. Until then the site
   uses `SAMPLE_ROWS` (offline demo mode).
2. **Form**: replace `FORM_ENDPOINT` in `js/main.js` with a real Formspree ID.
3. **Gallery/hero photos**: swap the `GALLERY_PHOTOS` array + `assets/hero-float-*.jpg`.
4. **Logo**: header/footer use an inline SVG wheel mark (`#wheel-mark` symbol in
   `index.html`) — swap for the real logo file when exported.
5. **Hero Lottie**: the hero is two swappable layers (`[data-layer="scene"]` /
   `[data-layer="rider"]`) per the build-guide contract. The final AE Lottie
   export replaces the SVGs inside those nodes; the ~6s crossfade loop lives in
   `initHeroFilm()` in `js/main.js`.

## Dev conveniences

- `?state=live|countdown|no_ride|weather_cancel|off_season` — preview any
  Next Ride state.
- `?jump=<scrollY>` — land pre-scrolled and settled; `window.__ready === true`
  once stable (used by the screenshot/jank harness).
- Console logs `[jank] max/p95` every 2s. Last measured: max 17.6 ms, 0 frames
  over 50 ms.
- All time logic is `America/Chicago` — test states by passing a `now` Date to
  `resolveRideState()` in `js/rideState.js`.
