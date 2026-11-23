# Friday Statsig results demo

This is explicitly simulated traffic, not Webjet customer evidence. It uses actual current timestamps and Statsig SDK assignments; it is not a historical backfill.

## Links

- [Live site](https://shermozle.github.io/webjet/)
- [Interactive banner experiment](https://console.statsig.com/bmtCqNq6OmrkbDSTAL4tI/experiments/webjet_landing_confidence/setup)
- [Separate synthetic results experiment](https://console.statsig.com/bmtCqNq6OmrkbDSTAL4tI/experiments/webjet_friday_synthetic_checkout/results)
- [Traffic workflow and run receipts](https://github.com/shermozle/webjet/actions/workflows/statsig-synthetic.yml)
- [Amplitude Web Experiment mode](https://shermozle.github.io/webjet/?page=home&experimentProvider=amplitude)

## Schedule and isolation

The synthetic experiment started Monday 23 November 2026, 11:19 AEDT. Each GitHub Actions run introduces 120 unique synthetic users. Runs are scheduled at minutes 7, 22, 37 and 52 of every hour, allowing about 38,000 visitors by Thursday evening if all runs execute on time. GitHub schedules can be delayed or skipped, so this is an estimate.

Traffic stops **Thursday 26 November 2026 at 18:00 AEDT**. The next scheduled invocation disables this workflow; the script independently enforces the deadline. Friday **27 November, 09:00 AEDT** is the assumed review time. The experiment stays active until the presenter makes a decision in Statsig.

The experiment targets only the custom field `data_source = github_actions_synthetic`. It splits eligible userIDs 50/50 into Control (`banner=control`) and Test (`banner=value`). The website evaluates only `webjet_landing_confidence`; this generator evaluates only `webjet_friday_synthetic_checkout`. Synthetic IDs start with `webjet-synthetic-` and all events carry source, run and simulation labels.

## Metrics and intended scenario

| Metric | Source event | Role | Direction |
|---|---|---|---|
| webjet_checkout_conversion | Checkout Started | Primary | Increase |
| webjet_booking_conversion | Booking Completed | Secondary | Increase |
| webjet_payment_failure_rate | Payment Failed | Guardrail / secondary | Decrease |

Each is a Unit Count / `event_user` metric with **One-Time Event** experiment rollup, so a user counts once even across several days. All are two-sided.

Checkout probability averages 20% in Control and 22% in Test, with realistic differences between four traveller personas. Completion after checkout is 40% versus 42%, giving approximately 8% versus 9.24% booking conversion. Payment failure probability remains 2% per checkout; because more users reach checkout, its per-exposed-user rate may move slightly. Failure and subsequent recovery can coexist. Group assignments and individual outcomes fluctuate; the generator does not force a final p-value or winner.

Every business event follows a real SDK experiment evaluation and exposure for the same user. No reserved exposure, pageview or session event is manually fabricated. Page/session autotracking remains enabled on the website; the headless traffic generator emits only the business funnel and SDK-owned exposures.

## Verification and controls

The first complete local live verification received acknowledgements for 20 exposure users and all 41 business events, with 10 users in each arm. An earlier launch-propagation attempt stopped after two users; it was not replayed. The generator now retries evaluation without exposure logging until a valid assignment is available, and refuses to invent assignments.

Each workflow run publishes a JSON receipt and job summary containing assignments, simulated conversions and **acknowledged** event counts. These are delivery checks, not Statsig's statistical results. Any delivery mismatch fails the job. The normal schedule sends new cohorts; rerunning the same GitHub run is deliberately skipped to avoid duplicate partial delivery. Use **Run workflow** for a new manual batch (1–240 users) if needed.

The workflow uses the existing public client SDK key and GitHub's built-in workflow token. No Statsig server/console key is required. To stop early, disable the workflow in GitHub Actions. To change the deadline or volume, edit `data/statsig-synthetic-config.json` and commit; after automatic disablement, explicitly re-enable the workflow. Local execution defaults to a dry run:

```sh
node scripts/statsig-traffic.mjs --users 120
node --test tests/statsig-traffic.test.mjs
# Explicit network delivery, only during the configured window:
node scripts/statsig-traffic.mjs --send --users 120
```

## Friday walkthrough

Open the synthetic experiment's Results tab. Confirm the computation timestamp, exposure counts, sample balance and primary metric confidence interval. Review booking conversion and payment failures. If the evidence supports a conclusion, use Statsig's Make Decision flow during the demo. If analysis is still pending or inconclusive, describe it accurately; traffic delivery does not guarantee processing completion or significance.

Statsig documents initial hourly analysis followed by daily calculations. Stopping Thursday evening leaves time for the overnight Sydney processing window. [Results processing](https://docs.statsig.com/experiments/interpreting-results/read-results), [SDK event logging](https://docs.statsig.com/client/javascript-sdk), [GitHub schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
