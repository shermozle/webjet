# Webjet × Statsig — presenter runbook

## Readiness

- Website: https://shermozle.github.io/webjet/?page=home.
- Open Statsig beside the website.
- Enter the Webjet public client key under Demo → SDK and reload.
- Confirm the intended project, environment and experiment before launching anything.
- The site is connected to the new [SR] Webjet project via its public client key; the MCP target remains read-only Amplitronics.
- Both analytics providers stay on. Choose the banner provider in Demo → SDK and reload.
- To demonstrate Amplitude Web Experiment, use `?page=home&experimentProvider=amplitude` as the editor starting URL.
- Use `webjet_friday_synthetic_checkout` for Friday’s results walkthrough. It is explicitly synthetic; keep `webjet_landing_confidence` for interactive banner QA.

## 1. Custom metrics and page tracking — 3 minutes

Start on the landing page. Explain the business question: does a clearer value and confidence message encourage more visitors to reach checkout?

Statsig autocapture provides `auto_capture::page_view`, `auto_capture::page_view_end`, `auto_capture::session_start` and Web Vitals. Precision events represent business intent and outcomes. The SDK handles session identity. No hand-written pageview/session events duplicate these.

Configured metrics (the first, second and fourth rows below):

| Metric | Definition | Direction |
|---|---|---|
| Checkout conversion | Exposed users with at least one Checkout Started / exposed users | Increase |
| Completed booking conversion | Exposed users with at least one Booking Completed / exposed users | Increase |
| Booking value per exposed user | Sum of Booking Completed numeric value / exposed users | Increase |
| Payment failures | Users with Payment Failed / exposed users | Decrease |

Do not use raw event count as a unique-user conversion rate. Repeat attempts otherwise inflate conversion. Evaluate the landing experiment only where its banner is rendered. Later conversion events retain the same userID across full-page navigation.

Open Demo → Events to show the local inspector, then use the Statsig console to prove receipt. The inspector is not the Statsig ingestion log.

## 2. Audiences — 2 minutes

The SDK sends these custom user fields:

- traveller_type: New visitor, Family planner, Frequent flyer, Deal seeker.
- member_status: Guest or Member.
- home_airport and preferred_destination.
- booking_count.
- demo_environment=true; data_source=website; qa_preview.

Define a Statsig targeting gate or segment with `traveller_type = Family planner` and `demo_environment = true`. Select that persona in Demo controls. Reload after changing the persona for a clean evaluation. No actual personal customer data is involved.

For measurement, keep eligibility stable and distinguish targeting from reporting segments. Changing identity or persona repeatedly is QA, not independent experimental evidence.

## 3. Banner swap, forced variants, QA, publish, pause — 4 minutes

The active Statsig experiment `webjet_landing_confidence` has these saved parameters and all three conversion/guardrail metrics attached:

| Group | Allocation | Parameter |
|---|---|---|
| Control | 50% | banner = control |
| Test (value & confidence) | 50% | banner = value |

Control heading: Your next adventure starts here.
Treatment heading: Less searching. More going.

The treatment also changes the descriptive copy and CTA. The site calls `getExperiment` once per landing-page load and uses the returned banner parameter. The SDK owns the exposure event.

Use Statsig's console assignment/override tools for actual SDK QA when available in the chosen project. The site's Force A/Force B controls are explicitly **local rehearsal**. They suppress Statsig experiment evaluation and precision-event delivery; Amplitude receives QA-tagged activity. They do not alter the Statsig experiment.

Publish or pause in the Statsig console to change the real experiment lifecycle. The similarly named local buttons are only an offline rehearsal. Use those only while explaining that distinction.

## 4. HTML, CSS and JavaScript changes — 2 minutes

**Current product caveat:** Statsig's official Sidecar documentation marks the visual editor deprecated/in maintenance mode and recommends Amplitude Web Experiment for new visual low-code work. Confirm the intended demo product before promising a point-and-click Statsig editor. Do not describe the local controls as a Statsig visual editor.

Stable targets available on the site:

| Selector | Use |
|---|---|
| #landing-hero | Banner container |
| #hero-headline | Headline text |
| #hero-description | Supporting copy |
| #hero-cta | Call to action |
| #hero-trust | Confidence indicators |
| #search-flights | Search conversion CTA |
| #start-checkout | Checkout entry CTA |
| #confirm-booking | Final simulated booking |

Developer-led sample edits are in `docs/visual-editor-examples.md`. They can illustrate the concept using the same site, but are not proof of a supported Statsig visual-editor capability.

## 5. Multivariate tests — 2 minutes

The local 2×2 preview combines two headlines and two CTA styles. Choose each combination in Demo → Experience. This does not create a Statsig experiment.

For a real Statsig implementation, create one four-group experiment with 25% in each group, parameters `headline` and `cta_style`, and connect those parameters to the rendering code. This makes the four combinations explicit and prevents two independently randomized experiments accidentally overlapping. The current live adapter reads only the two-arm `banner` parameter; MVT remains a local rehearsal.

Explain that a four-arm comparison estimates differences between combinations. An interaction claim needs an appropriate factorial analysis rather than treating any winning arm as proof of interaction.

## 6. Personalisation and holdbacks — optional 2 minutes

Select a persona, enable personalisation and compare Forced eligible with Forced holdback. Local assignment uses a stable visitor hash with a 10% holdback.

For the real console walkthrough, define eligibility and a holdout in Statsig if supported by the selected project. Apply the exclusion consistently across all personalised experiences. The browser's local holdback is a demonstration of behaviour; it is not a configured Statsig holdout and produces no valid holdout analysis.

## Conversion walkthrough

1. Return local settings to defaults for a live test.
2. Search Sydney → Melbourne.
3. Select a flight.
4. Add baggage; the total updates.
5. Continue to checkout: Checkout Started.
6. Submit fictional traveller details: Traveller Details Submitted.
7. Optionally simulate decline: Payment Failed.
8. Uncheck decline and confirm: Payment Submitted, then Booking Completed.
9. Refresh the confirmation page: the booking persists without firing a second Booking Completed.
10. Open My account: see the locally saved trip.

## Results strategy

The separate active experiment `webjet_friday_synthetic_checkout` receives prospective synthetic traffic through GitHub Actions every 15 minutes. It targets only `data_source = github_actions_synthetic`, so ordinary website visitors cannot enter it. The script never evaluates the interactive experiment.

Open its Results tab on Friday. Check data freshness, sample balance, the primary checkout metric and guardrails before using Make Decision. The model intends 20% versus 22% checkout conversion (+2 percentage points, +10% relative); observed results fluctuate and statistical significance is not promised. Describe any uplift as **simulated demo outcomes**, never Webjet customer evidence.

The traffic schedule was extended after the Friday demo and now stops Wednesday 23 December 2026 at 18:00 AEDT (Sydney). The workflow disables itself on its first invocation after that cutoff. Traffic stopping does not automatically make a Statsig decision. See [synthetic traffic controls](synthetic-traffic.md) for workflow links, receipts, deadlines and troubleshooting.

## Official references checked at pivot

- https://docs.statsig.com/client/javascript-sdk
- https://docs.statsig.com/webanalytics/overview
- https://docs.statsig.com/metrics/how-metrics-work
- https://docs.statsig.com/experiments/interpreting-results/read-results
- https://docs.statsig.com/guides/sidecar-experiments/sidecar-v3
