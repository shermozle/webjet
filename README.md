# Webjet demo — Statsig + Amplitude

A static React + TypeScript site inspired by Webjet, with a complete mocked flight booking journey. Runs on GitHub Pages; no backend, real payment or authentication.

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
3. The draft `webjet_landing_confidence` is created with `banner: "control"` and `banner: "value"` parameters in its two 50/50 groups, using userID. Add the conversion metrics, configure eligibility and start it in the console when ready.
4. Return all local rehearsal controls to defaults: automatic banner, draft/paused local status, MVT off, personalisation off, automatic holdback. These local overrides intentionally suppress experiment evaluations and precision events to Statsig.
5. Visit the landing page, search, choose a flight, add optional extras and complete checkout. Check Statsig's events/exposure tools to verify receipt. “Queued” in the local inspector is not a delivery receipt.
6. Keep the exact event names: `Checkout Started`, `Booking Completed`, `Payment Failed`. Booking Completed includes numeric event value for simulated revenue plus metadata.

The Webjet project and successful browser SDK initialization were verified. The browser inspector shows Statsig automatic page/session events alongside Amplitude pageviews. Server-side event receipt and experiment results must be verified separately.

## Data timing and presentation

Statsig Cloud does not ordinarily backfill already-computed historical metric days. Send events with their actual occurrence times. The first 24 hours of a new Cloud experiment have hourly scorecard calculations, but this is not an immediate-result promise or a completed result.

For an urgent demo, show the live Webjet setup/journey and use an existing, clearly identified Statsig example to explain results. Warehouse Native is an alternative for historical synthetic data if an appropriate warehouse/project is available.

The older Amplitude/TurboDemo assets remain in `data/` and `scripts/` for reuse. They are **not Statsig import formats**. The Amplitude upload was stopped on the pivot; the checkpoint records 78,400 accepted events. The batch is incomplete and the draft Amplitude experiment was not completed. Do not resume `scripts/backfill.mjs --send` for this Statsig demo.

## Six demo themes

See [the runbook](docs/statsig-demo-runbook.md) for a timed walkthrough, metric definitions, audience rules, real versus local controls, visual-editor limitations and MVT/holdback setup.

## GitHub Pages

```sh
npm run build
npm run preview
```

`dist/` is the deployment artifact. A Pages workflow is included in `.github/workflows/pages.yml`: push this project to a GitHub repository with a `main` branch and choose **GitHub Actions** as its Pages source. The workflow builds and deploys automatically. No repository or public deployment has been created by this task.

For a build-time key in GitHub Actions, supply `VITE_STATSIG_CLIENT_KEY` as an environment variable on the build step; a public client key is safe in browser code. The current workflow also works without it, allowing the presenter to enter it in Demo → SDK.

Routes use `?page=...`, so direct links and refreshes work under a repository subpath without server rewrite rules. Vite uses relative asset URLs.

## Validation

- `npm run build`: TypeScript + production build.
- `npm test`: deterministic legacy data generation checks.
- `npm run data:generate`: validates and regenerates TurboDemo CSV and mapping.
- Browser verified: flight search → selection → checkout → simulated decline → success; booking survives refresh; forced B updates the landing banner.

## Assets and limits

The font and travel images were obtained from public Webjet pages/assets for this demo. They are not original artwork or a claim to Webjet brand ownership. The page clearly identifies itself as an independent simulation. Fares and fees are illustrative; hotel/package journeys are lightweight detail/shortlist flows. Tours and Cars lead to the packages catalogue.

Personal form contents are not persisted or sent in precision events. Session replay is provided by Amplitude; it is not enabled in the Statsig adapter. Page/session events are SDK-generated, never precision events.
