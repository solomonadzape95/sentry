# Sentry — pitch

**See the shortage before it happens.**

Sentry is the predictive coordination layer for a health network: it shows what
every facility holds, what it will need, and where verified surplus can move
before a shelf is empty.

---

## The 30-second pitch

A health facility usually knows what is on its shelf today. It does not know what
will be missing in two weeks, and it cannot see the surplus sitting at the
facility next door. By the time a stockout is visible, the supplier lead time has
already passed.

Sentry closes that gap. It combines batch-level inventory, a 30-day demand
forecast and a network transfer recommendation in one workflow. Every
recommended move is batch-specific, human-approved and audited.

The demo network has four facilities. Three are carrying risk. Sentry finds the
next move — Gwagwalada PHC will run out of ACT in 11 days, and General Hospital
Abuja holds verified surplus. The transfer takes cover from 11 days to 48 days.

**The shelf is a data problem. Sentry makes it visible.**

---

## Why this wins

1. **We close the loop.** Most tools stop at a dashboard. Sentry goes from
   forecast → recommended batch → approval → dispatch → receipt → recalculated
   cover → audit trail.
2. **We show the evidence.** A working backtest, WAPE versus a seasonal baseline,
   uncertainty intervals, data provenance and visible weak lines.
3. **We build for the actual workflow.** Facility roles, network authority,
   offline PWA, batch expiry and human approval are part of the product, not
   slides.
4. **We are honest about the data.** Simulated facility records, real weather and
   public disease signals are labelled everywhere. We do not claim clinical
   validation.
5. **It is a network product.** The value compounds as more facilities join:
   more surplus, more shortages, more matches, better operational data.

---

## Slide-by-slide outline — 3 minutes

### Slide 1 — Cover (10s)

**Sentry**  
*See the shortage before it happens.*

Say:

> We are Sentry. We tell a health network which medicines will run out, when,
> and where the nearest verified surplus is — before the shelf is empty.

---

### Slide 2 — The problem is not counting (25s)

- A facility knows stock today, not stock in two weeks.
- Supplier lead times in the demo network are 9–18 days.
- By the time a shortage is visible, ordering is already too slow.
- Surplus sits at another facility, invisible.
- Expiry and stockouts are managed in separate conversations.

**Line:** *The problem is not that facilities cannot count. Counting does not tell
them what happens next.*

Use one visual: an empty shelf or a stock card next to a 14-day lead-time bar.

---

### Slide 3 — The insight (20s)

The network already holds the answer:

- Current stock and consumption.
- Supplier lead time and confirmed deliveries.
- Batch expiry and safe cover.
- Disease and weather signals.

The missing layer is a shared decision surface that turns those records into a
forecast and a move.

**Line:** *The intelligence is already in the network. Sentry makes it legible.*

---

### Slide 4 — The product (25s)

Three connected capabilities:

1. **Inventory** — batch-level stock, FEFO, expiry, receipts, issues.
2. **Prediction** — 30-day demand, uncertainty, stockout date, reorder gap.
3. **Coordination** — verified surplus matched to projected shortage, with a
   batch, an approval and an audit trail.

Under it: role-based access, offline mobile capture and a data provenance layer.

**Line:** *Inventory is the foundation. Prediction is the differentiator.
Coordination is the value.*

Show the network map or the facility cards here.

---

### Slide 5 — The demo (60–90s)

Use the recorded walkthrough or the live demo.

The story:

- 4 facilities, 1 shared stock picture.
- 3 of 4 facilities have at least one at-risk line.
- Gwagwalada PHC: ACT cover **11 days**.
- General Hospital Abuja: **verified surplus** with safe shelf life.
- Recommended transfer: **156 tablets**, batch `ACT-GH-B26T`.
- Cover after receipt: **~48 days**.
- Human approval, FEFO dispatch, destination receipt, audit trail.

**Line:** *We did not just forecast a number. We moved the batch that changes the
answer.*

---

### Slide 6 — Evidence, not vibes (30s)

- **48** facility-medicine forecasts across **12** essential medicines.
- **731 days** of consumption history in the demo.
- **XGBoost WAPE 16.6%** versus **seasonal baseline 28.6%** — a **42%**
  improvement on a held-out backtest.
- 80% and 95% intervals; confidence grades; low-data warnings.
- Stockout-censored days are excluded from accuracy scoring.
- Real public signals: NCDC reports, NMIS 2021 malaria prevalence and Open-Meteo
  rainfall; facility stock and consumption are clearly labelled simulated.
- Every source and ingestion run is visible in `/data`.

**Line:** *We benchmark the model, show the interval and publish the weak lines.*

---

### Slide 7 — Market and why now (25s)

- **70,235** geocoded health facilities in Nigeria in the GRID3 v4.0 extract;
  **1,047** in the FCT alone. The demo uses four as a working network.
- Public data is now usable: NCDC weekly reports, NMIS, Open-Meteo, facility
  master lists.
- Mobile devices and offline-first workflows reach the person at the shelf.
- Cheap, auditable forecasting is now practical outside a central data team.

Initial buyer: a facility network or state supply-chain team — not an individual
pharmacy. Start with one LGA/state network and the four facility archetypes:
PHC, general hospital, private hospital and community pharmacy.

---

### Slide 8 — Business model and go-to-market (25s)

Revenue:

- Per-facility subscription.
- Network / state deployment licence.
- Integration and implementation services.
- Paid pilots with hospital groups or supply-chain agencies.

Start with a **3–5 facility paid pilot** in the FCT. Prove the operational
metrics, then expand to an LGA or state network. The long-term position is an
intelligence and interoperability layer above NHLMIS/DHIS2, not a replacement.

Why the buyer cares:

- Fewer stockout days.
- Less emergency purchasing.
- Less expiry waste.
- Faster, traceable redistribution.
- One audit trail for every movement.

---

### Slide 9 — Competition and moat (20s)

| Category | What it does | What it misses |
|---|---|---|
| Spreadsheets | Records stock | No forecast, no network, no audit |
| DHIS2 / NHLMIS | National reporting | Not a daily decision tool, no transfer matching |
| Hospital ERP / HMIS | Transactions | Single facility, no redistribution |
| Inventory apps | Counts and issues | No forecast or network coordination |
| **Sentry** | **Inventory + forecast + transfer + audit** | **Built for the network** |

Moat:

- Operational data captured at the shelf.
- The network graph of shortage and surplus.
- Workflow and audit embedded in daily behaviour.
- Offline-first capture in low-connectivity settings.

---

### Slide 10 — Roadmap, team and ask (20s)

**Now**

- Working internal three-role product.
- 4-facility demo, 48 forecast lines, transfer workflow, offline PWA.
- Auth, invitations, password reset, role scoping and audit.

**Next 8–12 weeks**

- 3–5 real pilot facilities.
- Anonymised historical consumption and stock records.
- Clinical/pharmacy advisory review.
- Production email, MFA for approvers and Postgres row-level security.
- Measure stockout days, emergency purchases, expiry waste, transfer cycle time
  and stock-record accuracy against a baseline.

**Ask**

- A pilot network and a data-sharing agreement.
- A clinical/pharmacy advisor.
- Introductions to state supply-chain teams and hospital groups.
- Grant or prize funding to run the measurement pilot.

**Team slide:** add founder names, roles and photos here. Do not invent advisors.

**Close:**

> Every facility already has the signal. Sentry makes it visible, and turns it
> into a move. See the shortage before it happens.

---

## 60-second cut

> Facilities count what is on the shelf. They cannot see what will be missing in
> two weeks, or the surplus at the facility next door. By the time a stockout is
> visible, the supplier lead time has passed.
>
> Sentry is a predictive supply layer for a health network. It combines
> batch-level inventory, a 30-day demand forecast and a verified transfer
> recommendation. In the FCT demo, Gwagwalada PHC runs out of ACT in 11 days.
> General Hospital Abuja has surplus. Sentry recommends 156 tablets, with the
> batch and expiry attached. A human approves it. Cover moves from 11 days to 48.
> The receipt recalculates the projection and the audit trail closes.
>
> The model is not a black box: 16.6% WAPE against a 28.6% seasonal baseline, a
> 42% improvement, with intervals and weak lines shown.
>
> We are looking for a 3–5 facility pilot to measure stockout days, expiry waste
> and transfer time. The shelf is a data problem. Sentry makes it visible.

---

## Demo video

**File:** `demo/sentry-demo.mp4`

The video follows the same story as the demo. A voiceover script is included
below so it can be re-recorded with a human narrator.

### Narration

> Sentry. See the shortage before it happens.
>
> Every health facility knows what is on the shelf today. Almost none can see
> what will be missing in thirty days. By the time a shortage is visible, the
> supplier lead time has already passed.
>
> This is the FCT network. Four facilities, one shared view. Three of four are
> carrying risk. The system has already found the next move: Gwagwalada Primary
> Health Centre will run out of ACT in eleven days, while General Hospital Abuja
> is holding verified surplus.
>
> The map is live. Each facility is an icon, coloured by risk. The recommended
> transfer route is drawn between source and destination.
>
> The risk horizon ranks every at-risk line by days of cover. The forecast uses
> 731 days of consumption, rainfall and public disease signals. This line is
> critical because its cover is shorter than the fourteen-day supplier lead
> time. The eighty percent interval is shown, not hidden.
>
> Review transfer turns the forecast into a batch-level action: 156 tablets from
> General Hospital to Gwagwalada. Cover moves from eleven to forty-eight days.
> Nothing moves until a person approves it.
>
> Create request. Approve and dispatch. FEFO deducts the source stock. Confirm
> receipt at the destination. The projection recalculates and the audit trail is
> complete.
>
> Each facility has its own operational view: stock, expiry, incoming deliveries,
> and the work queue for the person at the shelf.
>
> We show our work. XGBoost reaches 16.6 percent WAPE against a 28.6 percent
> seasonal baseline, a 42 percent improvement on a held-out backtest. Weak lines
> are visible, and stockout-censored days are excluded from scoring.
>
> Sentry makes the shelf a live signal. See the shortage before it happens, and
> move stock before care is interrupted.

---

## Q&A preparation

**Is the data real?**
Facility inventory and consumption are simulated and labelled as such. Weather
is real Open-Meteo ERA5 history. Disease signals mix real NCDC reports with
derived malaria and respiratory indices. The evidence proves the pipeline, not
real-world impact.

**Why not use DHIS2/NHLMIS?**
Those systems are reporting and records layers. Sentry is a daily decision and
coordination layer. It can consume their data rather than replace them.

**How accurate is the forecast?**
16.6% WAPE on the held-out demo backtest versus 28.6% for a seasonal baseline.
The line-level table shows where it is weaker. Low-data lines are flagged.

**Is this clinically safe?**
Sentry does not diagnose, prescribe or substitute medicines. It recommends a
supply move; a human makes the clinical and operational decision.

**What stops a facility from hoarding?**
The recommendation preserves safe cover at the source. The network authority
can see the trade-off, and every move is audited.

**How do you make money?**
Per-facility subscription, network/state deployment, integration services and
paid pilots. The pilot establishes willingness to pay.

**What is the biggest risk?**
Data capture discipline at the shelf. That is why the mobile tool, offline queue
and audit trail are core product, not afterthoughts.

**What would you do with a prize?**
Fund a 3–5 facility, 8–12 week pilot and measure operational outcomes against a
baseline.

---

## Do not claim

- That simulated results prove real-world stockout reduction.
- That the platform can prescribe, diagnose or substitute medicines.
- That disease-to-medicine relationships are clinically validated.
- That the demo accounts are a production identity system.
- That Sentry replaces NHLMIS, DHIS2 or an existing hospital system.

Specific, measured claims beat big, unverifiable ones.
