# Pitch outline

**Sentry — know what you have. Know what you will need. Know where stock can move.**

*A watch kept on every shelf in the network.*

A 7-slide, 3-minute structure. Pair with [DEMO.md](DEMO.md).

**Open on `/` first** (landing page), then move to `/dashboard` for the live demo.

---

## Slide 1 — The stockout is visible too late

- A facility knows its stock today, not its stock in two weeks.
- Supplier lead times are 9–18 days in the demo network. By the time a shortage is
  visible, ordering is already too slow.
- Inventory records are fragmented, consumption is not analysed, and facilities do
  not coordinate surplus.

**Line:** *The problem is not that facilities cannot count. It is that counting does
not tell them what happens next.*

---

## Slide 2 — Three connected capabilities

1. **Inventory:** batch-level stock, FEFO, expiry, receipts and issues.
2. **Prediction:** demand forecasts with uncertainty, stockout dates and reorder
   quantities.
3. **Coordination:** verified surplus matched to predicted shortage, with approval
   and batch traceability.

**Line:** *Inventory is the foundation. Prediction is the differentiator. Coordination
is the value.*

---

## Slide 3 — The demo (the 90-second story)

- Gwagwalada PHC: 109 ACT tablets, **11 days** of cover.
- General Hospital Abuja: **761 tablets** above safe cover, batch with 250 days shelf life.
- The system recommends **156 tablets**.
- Approve → dispatch → receive.
- Cover moves from **11 days to ~49 days**. The alert clears. The transfer is audited.

Show the dashboard, the forecast and the mobile offline issue.

**Line:** *We did not just forecast a number. We closed the loop.*

---

## Slide 4 — Why the forecast is credible

- Models: seasonal baseline, 28-day moving average, Ridge, XGBoost, ensemble.
- 28-day held-out backtest across 48 facility-medicine series.
- XGBoost **WAPE 16.7%** vs seasonal baseline **28.6%** on the simulated dataset.
- Stockout-censored days are excluded from accuracy scoring.
- Every forecast carries an uncertainty interval and a confidence grade.
- Low-data series get a warning, not a fake precise number.

**Line:** *We benchmark the model against a simple baseline and report where it fails.*

---

## Slide 5 — Product surfaces

| Surface | Who | What |
|---|---|---|
| Web command centre | Network authority | Risk map, stockout radar, transfer matching |
| Facility dashboard | Facility manager | Stock health, expiry, consumption, incoming deliveries |
| Predictive dashboard | Managers, authorities | Forecast vs actual, uncertainty, signals, reorder |
| Inventory | Pharmacists, storekeepers | Batches, FEFO, receive/issue, counts |
| Mobile PWA | Inventory operators | Scan, issue, receive, count, offline sync |
| Model performance | Technical + clinical reviewers | Backtest, weakest lines, limitations |

---

## Slide 6 — Market and business model

Start with private facilities for faster purchasing and direct customer discovery.
Use pilot evidence to pursue institutional deployments.

Revenue routes:

- Facility subscription.
- Hospital-group licence.
- State deployment and support.
- Integration services.
- Development-partner-funded deployments.

Long-term position: an **interoperability and intelligence layer** on top of NHLMIS,
DHIS2 and existing facility systems — not a replacement.

---

## Slide 7 — The ask and the plan

**Now:**

- 3–5 pilot facilities (PHC, general hospital, private hospital, pharmacy).
- Anonymised historical consumption and stock records.
- A clinical/pharmaceutical advisory relationship.
- A data-sharing agreement and pilot success metrics.

**Then:**

- 8–12 week operational pilot.
- Measure stockout days, emergency procurement, expiry and availability against
  a baseline.
- Publish the evidence. Approach state ministries, drug management agencies and
  development partners with results, not promises.

**Close:** *We built the inventory foundation, demonstrated the predictive advantage
and proved the coordination loop. The next step is real facilities and measured
impact.*

---

## Thing we will not claim

- That simulated results prove real-world stockout reduction.
- That the platform can prescribe, diagnose or substitute medicines.
- That disease-to-medicine relationships are clinically validated.
- That the demo personas are authentication.
- That we replace existing national systems.

Judges trust specificity. Name the limitation before they find it.
