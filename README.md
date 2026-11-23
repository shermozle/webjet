# Webjet demo — Statsig + Amplitude

A static React + TypeScript site inspired by Webjet, with a complete mocked flight booking journey. Live at **https://shermozle.github.io/webjet/**; no backend, real payment or authentication.

Friday’s separate synthetic experiment and 15-minute traffic schedule are documented in [synthetic traffic](docs/synthetic-traffic.md).

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:5173/?page=home. Use **Demo** (bottom right) or **Alt+D** for local variant previews, audience personas, 2×2 multivariate combinations, personalisation, holdback, event inspection and reset.

## Choose an experiment provider

Both analytics SDKs remain enabled, with automatic pageviews/sessions and the same business event taxonomy. Amplitude uses Webjet project 915629; Statsig uses [SR] Webjet (`bmtCqNq6OmrkbDSTAL4tI`).

Open **Demo → SDK → Experiment provider**, choose Statsig or Amplitude Web Experiment, then **Reload with SDK settings**. Only the selected provider controls the real banner experiment. Amplitude Web Experiment's project script loads synchronously in Amplitude mode; Statsig banner evaluation is disabled in that mode.

Direct presenter links:

- `?page=home&experimentProvider=statsig`
- `?page=home&experimentProvider=amplitude`

Set the Amplitude visual editor starting URL to the second link (using the actual localhost or deployed origin). Local rehearsal controls should remain at defaults when demonstrating either provider.

Amplitude Session Replay and Guides & Surveys are available under SDK settings. Amplitude QA activity is tagged; local forced QA precision events are excluded from Statsig. The historical Amplitude upload remains stopped.

## Connect Statsig

1. The site defaults to **[SR] Webjet** using its existing public client SDK key, retrieved from the signed-in console. The MCP connector remains scoped to read-only Amplitronics; that project was not modified.
2. Enter the project's **public client SDK key** in Demo → SDK and reload. Alternatively set `VITE_STATSIG_CLIENT_KEY` in `.env.local` before building. Browser settings override build defaults if previously saved; reset the demo to adopt a new build default.
3. `webjet_landing_confidence` is active, with `banner: "control"` and `banner: "value"` parameters in two 50/50 groups, using userID. Checkout conversion is primary; booking conversion and payment failure rate are secondary. All three use unique-user, one-time-event rollups.
4. Return all local rehearsal controls to defaults: automatic banner, draft/paused local status, MVT off, personalisation off, automatic holdback. These local overrides intentionally suppress experiment evaluations and precision events to Statsig.
5. Visit the landing page, search, choose a flight, add optional extras and complete checkout. Check Statsig's events/exposure tools to verify receipt. “Queued” in the local inspector is not a delivery receipt.
6. Keep the exact event names: `Checkout Started`, `Booking Completed`, `Payment Failed`. Booking Completed includes numeric event value for simulated revenue plus metadata.

Verified on the published site: real Statsig Control assignment (`Network:Recognized`), automatic SDK events, Amplitude Web Experiment script loading in Amplitude mode, and receipt of checkout, booking and payment-failure events in Statsig. Business events flush before full-page navigation.

## Data timing and presentation

Statsig Cloud does not ordinarily backfill already-computed historical metric days. Send events with their actual occurrence times. The first 24 hours of a new Cloud experiment have hourly scorecard calculations, but this is not an immediate-result promise or a completed result.

A separate active experiment, `webjet_friday_synthetic_checkout`, receives clearly labelled synthetic visitors through GitHub Actions every 15 minutes until Thursday 26 November, 18:00 Sydney time. Its intended scenario is 20% versus 22% checkout conversion. Review Statsig’s computed results on Friday 27 November; significance and processing time are not guaranteed. See [traffic controls and results guidance](docs/synthetic-traffic.md).

The older Amplitude/TurboDemo assets remain in `data/` and `scripts/` for reuse. They are **not Statsig import formats**. The Amplitude upload was stopped on the pivot; the checkpoint records 78,400 accepted events. The batch is incomplete and the draft Amplitude experiment was not completed. Do not resume `scripts/backfill.mjs --send` for this Statsig demo.

## Six demo themes

See [the runbook](docs/statsig-demo-runbook.md) for a timed walkthrough, metric definitions, audience rules, real versus local controls, visual-editor limitations and MVT/holdback setup.

## GitHub Pages

```sh
npm run build
npm run preview
```

`dist/` is the deployment artifact. The public repository is https://github.com/shermozle/webjet. GitHub Pages uses the Actions workflow in `.github/workflows/pages.yml`; pushes to `main` build, test and deploy automatically. The deployed site is https://shermozle.github.io/webjet/.

For a build-time key in GitHub Actions, supply `VITE_STATSIG_CLIENT_KEY` as an environment variable on the build step; a public client key is safe in browser code. The current workflow also works without it, allowing the presenter to enter it in Demo → SDK.

Routes use `?page=...`, so direct links and refreshes work under a repository subpath without server rewrite rules. Vite uses relative asset URLs.

## Validation

- `npm run build`: TypeScript + production build.
- `npm test`: six deterministic checks covering legacy generation, synthetic funnel ordering, intended lift, identity, labels and the traffic deadline.
- `npm run data:generate`: validates and regenerates TurboDemo CSV and mapping.
- Browser verified: flight search → selection → checkout → simulated decline → success; booking survives refresh; forced B updates the landing banner.

## Assets and limits

The font and travel images were obtained from public Webjet pages/assets for this demo. They are not original artwork or a claim to Webjet brand ownership. The page clearly identifies itself as an independent simulation. Fares and fees are illustrative; hotel/package journeys are lightweight detail/shortlist flows. Tours and Cars lead to the packages catalogue.

Personal form contents are not persisted or sent in precision events. Session replay is provided by Amplitude; it is not enabled in the Statsig adapter. Page/session events are SDK-generated, never precision events.
