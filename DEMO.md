# Demo script

**Length:** 3 minutes (90-second core flow + optional proof).
**Start state:** run `npm run db:reset` immediately before presenting.
**Demo clock:** 17 November 2026.

---

## 0. Before the judges arrive

```bash
npm run setup          # first time only
npm run db:reset       # clean demo state
npm run build && npm start
```

Open:

- Landing page: <http://localhost:3000>
- Sign in: <http://localhost:3000/sign-in>
- Dashboard after sign-in: <http://localhost:3000/dashboard>
- Mobile: <http://localhost:3000/m>
- If port 3000 is in use, use the port printed by Next.

Check:

- You are signed in as **Dr. Ngozi Adeyemi** (network authority); no account switcher exists.
- Gwagwalada PHC ACT shows **110 units**, **11 days** cover.
- General Hospital Abuja ACT shows **~1,010 units** transferable surplus.
- No transfers exist in the pipeline.

If anything is stale, `npm run db:reset`.

---

## 1. Open on the landing page (15s)

Open `/` first. Let the room see the product promise before the dashboard.

- Headline: **See the shortage. Before it happens.**
- The live snapshot card: Gwagwalada PHC, 11 days, 156-unit transfer.
- Then choose **Dr. Ngozi Adeyemi** on the sign-in page and sign in. The app opens
  on `/dashboard`; signed-out visitors are always sent to sign-in first.

Say:

> This is the whole product in one sentence: know what you have, know what you
> will need, and move stock before the shelf is empty.

## 2. The problem, in one screen (20s)

Now on `/dashboard` — **Network overview**.

Say:

> Nigerian facilities often know what they have, but not what they will need. By the
> time a stockout is visible, the supplier lead time has already passed. This is a
> predictive coordination layer, not another hospital management system.

Point at:

- **Facilities at risk:** 3 of 4.
- **Stockout risk lines:** 3 within 14 days.
- **Next best move:** Gwagwalada PHC runs out of ACT in 11 days; General Hospital
  Abuja holds surplus above safe cover.
- **Risk horizon:** ACT is critical because its projected cover is shorter than
  its 14-day supplier lead time.
- **Forecast explorer:** demand is above the recent 28-day average; the full
  forecast page shows the NCDC, malaria and rainfall signals behind it.

---

## 3. The core flow: predict → match → transfer → recalculate (60s)

### Predict

Click **Review transfer** in the next best move card.

The draft shows:

- 156 tablets of Artemether/Lumefantrine.
- Source: General Hospital Abuja.
- Destination: Gwagwalada PHC.
- Batch `ACT-GH-B26T`, expiry 25 Jul 2027, 250 days shelf life.
- Reason: stockout is projected before the next confirmed delivery, which is 21 days away.
- Cover after transfer: about 49 days.

Say:

> The system did not just forecast demand. It compared the facility's stock, the
> confirmed delivery date and the supplier lead time, then found verified surplus
> at another facility with enough shelf life.

### Request

Click **Create transfer request**.

The request enters the pipeline as **Pending approval**.

### Approve and dispatch

Click **Approve & dispatch**.

Say:

> Source stock is deducted using FEFO. The transfer is now in transit. No stock moves
> without an authorised manager or network authority.

### Receive

Click **Confirm receipt**.

Say:

> Destination stock is added only on receipt. The transfer is complete and fully
> auditable.

### Recalculate

Click **Network overview**.

Point out:

- The green next-best-action strip is gone.
- ACT no longer appears in the risk horizon for Gwagwalada PHC.
- Open `/facilities/fac_phc`: ACT cover has moved from 11 days to roughly 49 days.
- The alert cleared automatically because the projection is live, not a stored warning.

This is the product promise: **know what you have, know what you will need, know
what might run out, know where stock can move.**

---

## 4. Proof: the model (30s)

Open `/forecasts?facility=fac_phc&medicine=med_act`.

Point at:

- Historical consumption vs forecast with an 80% uncertainty band.
- Projected stockout date and recommended reorder quantity.
- **Forecast error (WAPE): ~26%** on the 28-day backtest, medium confidence.
- Model explanation: lags, seasonality, rainfall, temperature, humidity and disease
  signals. Low-data warnings are explicit.
- Replenishment recommendation: supplier lead time (14 days) exceeds projected cover,
  so ordering alone is too slow — transfer is the correct action.
- Model comparison table: XGBoost beats the seasonal baseline overall.

Open `/model` for the full evaluation:

- XGBoost **WAPE ~16.7%** vs seasonal baseline **~28.6%** across 48 series.
- Stockout-censored days are excluded from accuracy scoring.
- The weakest lines are reported, not hidden.
- Limitations: simulated facility data and medicine consumption, mixed-provenance
  disease signals, no live NHLMIS/DHIS2 feed, approximate intervals.
- Real-target validation: 4-week rolling holdout on six NCDC disease series.
  Per-disease selection WAPE **46.1%** vs seasonal **103.7%**. This is
  disease-burden accuracy, not medicine-demand accuracy.

Say:

> These metrics prove the pipeline works. They do not prove we reduce stockouts in
> the field. That requires an 8–12 week pilot with real facility data.

---

## 4b. Optional proof: where the data comes from (20s)

Open `/data`.

Point at:

- **Source register:** NCDC WER, GRID3/NHFR facilities, NMIS 2021, NEML 2024
  and Open-Meteo are active; DHIS2, NHLMIS and NHFR API are access-gated and
  clearly labelled — not bypassed.
- **Observed vs derived:** cholera, meningitis and Lassa fever are observed NCDC
  reports; malaria and respiratory are derived and labelled; facility inventory
  is simulated.
- **Ingestion runs:** rows read, accepted, rejected and date coverage for every
  source.
- **Real-target validation:** selected WAPE **46.1%** vs seasonal **103.7%** on
  real NCDC disease counts.
- **Imputation honesty:** NCDC weeks after the latest report are marked
  `IMPUTED`, not presented as fresh.

Say:

> We did not just generate a dataset. We sourced real public data, recorded its
> provenance, labelled every derivation, and validated the model on a real target
> before touching a medicine forecast.

---

## 5. Mobile: the operational layer (30s)

Open `/m` on a phone, or show the phone frame on desktop.

### Scan

Tap **Scan medicine** → **Start camera**.

- Scan the ACT demo barcode from another screen, or use manual fallback.
- Show the medicine card: on hand, cover, quantity, **Issue now**.
- If camera permission fails: use the manual search list or the demo barcode labels.

### Issue

Tap **Issue stock**.

- Choose a medicine, set quantity, submit.
- Stock is deducted FEFO and recorded against the inventory operator.

### Offline

Toggle **Demo: queue this entry offline**, submit.

- The entry is saved in IndexedDB, not posted.
- Tap **Queue** → the operation is listed as pending.
- Tap **Sync now** → it syncs, the queue empties, and stock updates.
- Each entry carries a client ID so a retried request cannot double-post.

### Stock count

Tap **Stock counts** on the mobile home.

- The form defaults to the highest-risk medicine.
- Enter a physical count; the variance is shown before submission.
- Submitting a shortfall writes an audited adjustment. A surplus must be received as a batch so expiry is captured.

### Facility scoping

Sign out and sign in as **Amina Yusuf** (inventory operator, Gwagwalada PHC) or
**Emeka Nwosu** (CarePoint Pharmacy) to show that the mobile home, stock and
actions follow the account's facility scope. The sign-in page lists the demo
accounts; the password is `sentry-demo-2026`.

---

## 6. The close (15s)

> We built the inventory foundation, demonstrated the predictive advantage and proved
> the coordination loop. The next step is not more features — it is three to five
> pilot facilities, real anonymised consumption data and an 8–12 week measurement
> period. Then we pursue state and federal adoption as an interoperability layer,
> not a replacement for NHLMIS or DHIS2.

---

## Backup plan

| Risk | Fallback |
|---|---|
| No wifi at venue | Everything runs locally: SQLite, cached weather, local data. Do not run `npm run data` on stage. |
| Camera permission fails | Manual search and demo barcode labels are always available. |
| Phone camera blocked over LAN http | Camera APIs need HTTPS or localhost. Demo scanning on the laptop, use an HTTPS tunnel, or use manual fallback. |
| Projector too small | Use the dashboard, not the phone frame. `/m` also works at desktop width. |
| Demo state dirty | `npm run db:reset` takes a few seconds. |
| Numbers differ slightly | Narrate the live numbers. The story is the direction: ~11 days → ~49 days, alert clears. |
| Judge asks “is this real data?” | “Facility inventory and medicine consumption are simulated and labelled. Weather, NCDC outbreak reports, GRID3/NHFR facilities and NMIS prevalence are real. Malaria and respiratory signals are derived and labelled. We will not claim impact until a pilot.” |

---

## Likely judge questions

**Why not replace NHLMIS or DHIS2?**
We deliberately do not. The long-term product is a predictive and coordination layer
that consumes authorised data from existing systems. Replacement is a procurement and
change-management trap.

**How do you know the forecast is any good?**
Time-ordered backtesting against a seasonal baseline, WAPE/MAE/bias, censoring-aware
scoring, per-series model selection and explicit low-data warnings. A complex model is
rejected where a baseline wins.

**What if a facility has no history?**
It gets a low-confidence warning and a simple baseline, not a fake precise forecast.
The product is honest about data sufficiency.

**Why would a facility share stock data?**
Transfers prevent stockouts and expiry, and the network view is aggregated. Facility
inventory stays private unless explicitly shared. The pilot tests willingness to share.

**Who pays?**
Facility subscriptions, hospital-group licences, state deployment and support,
integration services, and development-partner-funded deployments. Start with private
facilities for faster purchasing, then use pilot evidence for public-sector contracts.

**Is this clinically safe?**
The platform never prescribes, diagnoses or substitutes medicines. Disease-to-medicine
links are planning hypotheses and must be validated by pharmacists and clinicians.
Transfers require human approval and batch/shelf-life checks.

**What is actually new?**
Not inventory software. The combination of live stock, confirmed deliveries, forecast
demand, uncertainty, stockout timing and cross-facility surplus matching — with a
recalculation loop after every action.
