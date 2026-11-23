# Webjet demo site specification — Statsig + Amplitude

Status: implemented static site with a Statsig-ready adapter. Statsig [SR] Webjet is connected using its public client key; both analytics SDKs initialize. No completed Statsig experiment result exists. User approved full flights and lighter hotels/packages/account scope.

## Technology and deployment

- React 19, TypeScript, Vite; no server runtime.
- GitHub Pages Actions workflow builds `dist/`.
- Relative Vite base supports repository subpaths.
- Query-string routes avoid deep-link rewrite requirements.
- Local font, aerial coast hero and destination images from public Webjet assets.
- Red brand header, teal photography, purple action buttons, white booking panels.
- localStorage contains simulated booking and presenter preferences.
- All payments, availability, schedules and accounts are simulated.

## Page inventory

| Route | Purpose | Main onward action |
|---|---|---|
| ?page=home | Landing banner, flight search, destinations | results |
| ?page=deals | Domestic/international deals | home with selection |
| ?page=results | Flight comparison, filters, sort | extras |
| ?page=extras | Baggage, seat, flexibility | checkout |
| ?page=checkout | Traveller details and mock payment | confirmation |
| ?page=confirmation | Persistent booking reference | account / home |
| ?page=hotels | Three illustrative stays | details / shortlist |
| ?page=packages | Three illustrative packages | details / shortlist |
| ?page=account | Local sign-in and booking history | home |
| ?page=support | Expandable help articles | booking / search |

## Global components

Header mirrors the Webjet product navigation and sign-in actions. Tours and Cars intentionally point to the lightweight packages collection. The footer provides product, support and account links, plus an independent-demo statement. A fixed Demo button and Alt+D open the studio. The native dialog supports Escape and a visible close control. Responsive CSS adapts cards, navigation, filters and summaries at 1100px, 800px and 560px.

## Core journey

1. Select return or one-way, origin, destination, dates, travellers and cabin.
2. Validate different airports and return date ordering. Browser-native date minimum enforces future selection.
3. Persist the search and clear previous flight/extras before navigation.
4. Compare five illustrative flights; filter airline/direct and sort recommendation/price/departure.
5. Choose flight; persist selection and reset extras.
6. Toggle optional baggage, seat and flexible-fare add-ons.
7. Calculate per-traveller fare, return multiplier, per-traveller extras and fixed booking fees.
8. Continue to checkout; emit Checkout Started once per click.
9. Submit fictional names and contact email. These values remain only in the form.
10. Simulate payment decline if requested, displaying an error and leaving the user on review.
11. Confirm successful booking; disable the button while navigating to prevent repeated clicks.
12. Persist booking UUID, destination, total, departure date and airline.
13. Emit Payment Submitted followed by Booking Completed.
14. Reload confirmation without creating another booking or conversion event.
15. View all locally saved bookings under account.

## Mock data and state

State contract is implemented in `src/model.ts`:

- Version: 1.
- visitorId: random UUID persisted on first load.
- persona: New visitor, Family planner, Frequent flyer, Deal seeker.
- loggedIn: boolean, independent from real authentication.
- search: from, to, depart, returnDate, travellers, cabin, trip.
- flight: id, airline, code, time, arrival, price, stops, duration.
- extras: IDs of selected optional services.
- bookings: id, destination, total, date, airline.
- settings: Statsig key/experiment/environment/console and local preview settings.

`webjet-demo-v1` stores state. `webjet-shortlist` stores saved hotel/package labels. Reset creates a new visitor and removes the shortlist. SDK-owned storage is separate. Reset is a demo identity reset, not erasure of previously uploaded analytics.

The default search is Sydney → Melbourne, one adult, economy, return. Available cities include major Australian destinations, Bali, Auckland, Fiji and Tokyo. Mock carriers are Jetstar, Virgin Australia and Qantas. Base fares range from $89 to $189. Business and international multipliers are illustrative.

The booking breakdown includes $21.95 servicing plus $13.95 booking price guarantee; these amounts are explicitly demo amounts, not a current general Webjet pricing claim. Baggage is $35, seat $18 and flexibility $45 per traveller. Hotel/package prices and inclusions are illustrative.

## Statsig integration

`src/analytics.ts` sends business events to both providers. `src/amplitude-bridge.ts` initializes Amplitude Unified analytics, replay and engagement. The selected experiment provider controls banner evaluation: Statsig SDK parameter or synchronous Amplitude Web Experiment script. The provider selection applies after reload.

A Statsig client initializes only when a public client key is configured. User identity is `webjet-demo-<visitor UUID>`. Custom attributes include traveller_type, member_status, home_airport, preferred_destination, booking_count, demo_environment, data_source and qa_preview.

The official web-analytics plugin owns pageviews and sessions. Its filter allows page_view, page_view_end, session_start and web_vitals. Automatic clicks/forms/copy are excluded to keep the precision taxonomy clear and avoid form contents. Amplitude supplies session replay; Statsig replay is not installed.

Precision metadata includes page_name, product_type, origin, destination, trip_type, travellers and currency, plus action-specific properties. Booking Completed uses numeric revenue as the Statsig event value. All metadata values are serialized as strings.

The event inspector distinguishes local-only from queued delivery. It is not a receipt. Real delivery and exposure must be verified in Statsig after a valid key is supplied.

## Precision events

| Event | Trigger | Additional fields |
|---|---|---|
| Destination Selected | Destination card selected | destination |
| Flight Search Submitted | Valid search submission | departure_date, return_date, origin, destination, travellers, trip_type |
| Flight Filter Applied | Airline/direct filter | filter_type, filter_value |
| Flight Sort Changed | Sort selection | sort_by |
| Flight Selected | Flight card select | flight_id, airline, fare |
| Travel Extra Updated | Extra toggled | extra_type, action, price |
| Checkout Started | Extras continue | booking_value, airline |
| Traveller Details Submitted | Valid traveller form | traveller_count |
| Payment Failed | Simulated decline | failure_reason, booking_value |
| Payment Submitted | Successful mock payment | payment_method, booking_value |
| Booking Completed | Booking persisted | booking_id, booking_value, revenue, payment_method, airline |
| Banner Clicked | Hero CTA | placement and variant context |
| Destination Filter Applied | Domestic/international tab | selected filter |
| Hotel Selected | Hotel details | product_type, destination |
| Package Selected | Package details | product_type, destination |
| Trip Saved | Shortlist action | product_type, destination |
| Account Signed In | Mock sign-in | method |
| Fare Alert Created | Save destination | preferred destination |
| Support Article Opened | Accordion opened | notification_type, product_type |

The TurboDemo CSV includes additional template-required synthetic-only events. Those are not added to the website solely to satisfy the generator. TurboDemo files and the older experiment dataset are Amplitude assets, not Statsig import formats.

## Experiment contract

Name: webjet_landing_confidence.
Assignment unit: userID.
Parameter: banner.
Control value: control.
Treatment value: value.
Intended allocation: 50/50.
Exposure: getExperiment only when the landing component resolves the banner.
Primary suggested metric: unique-user Checkout Started conversion.
Secondary: unique-user Booking Completed conversion and revenue per exposed user.
Guardrail: Payment Failed user rate.

The adapter's decision cache prevents repeated evaluation calls on routine React rerenders. Page navigation maintains identity. Actual targeting, lifecycle and metric definitions are configured in Statsig, not by the site.

## Demo controls and boundaries

- Forced A/B is local QA, visibly labelled.
- Local publish/pause changes only this browser.
- MVT offers four local headline/CTA combinations.
- Personalisation changes local headline by persona.
- Holdback uses a stable hash, with a default 10% local exclusion.
- Those rehearsal settings suppress Statsig evaluation and precision delivery; Amplitude activity is QA-tagged.
- Real Statsig MVT and holdout configurations are not yet wired.
- The current live adapter reads only the two-arm banner experiment.
- SDK settings apply after reload.
- The event log is capped at 80 entries per page load.

## Visual-editor support

Stable IDs and sample HTML/CSS/JS edits are provided. Statsig's current official Sidecar documentation marks the visual editor deprecated/in maintenance mode and recommends Amplitude Web Experiment for new visual low-code experimentation. The site does not misrepresent its local studio as Statsig's visual editor. Confirm the intended supported product before demonstrating that workflow.

## Data and timing

The old synthetic Amplitude dataset models 6,000 users per arm with a realistic illustrative funnel. Its upload was stopped at 78,400 accepted events when the user pivoted. It is incomplete, and the associated Amplitude experiment remains unfinished. No additional ingestion is authorized by the Statsig adapter.

Statsig Cloud historical metric backfill is not a standard capability. For the urgent demo, pair a live website interaction with an existing clearly identified results example. For actual new experiment results, generate current-time traffic using real SDK assignments and allow computation. For historical synthetic analysis, a Warehouse Native project and dataset are separate prerequisites.

## Verification and remaining work

Completed: TypeScript compile, production build, legacy deterministic data tests, browser flight booking and persistence, decline recovery, forced banner change, Statsig settings UI.

Verified: Webjet public client key, Statsig initialization, both SDKs generating automatic events, Amplitude Web Experiment script in Amplitude mode, saved Statsig two-group draft. Not verified: server receipt, active real assignment, lifecycle controls, live MVT/holdout, historical results, published Pages deployment. Mobile CSS is implemented; the browser viewport override did not change the observed viewport, so mobile visual verification remains outstanding.

## Build sequence and scope

Implemented in order: local state and mock inventory; landing/search; comparison/extras; checkout/confirmation; account/catalogue/support; precision taxonomy and original analytics; local demo controls; GitHub Pages workflow; Statsig adapter pivot and runbook.

Remaining connection sequence: add metrics to the saved Statsig banner draft → start experiment → verify real exposures and checkout events → publish Pages repository if requested → rehearse with a prepared results example.

Out of scope: real travel inventory, card capture, authentication, email delivery, backend APIs, genuine customer data, automatic creation of a Statsig completed-result history, production ownership of Webjet assets.
