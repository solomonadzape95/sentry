# Sentry design direction

Sentry is Igbo-adjacent in spirit only: the product is the memory of the medicine
shelf. The landing page and the application share one warm, editorial system.

This document replaces the earlier Cheta-era design notes. It describes the
current code, not an aspirational palette.

## 1. Brand idea

- **Editorial, not clinical.** Warm paper, ink and clay instead of hospital blue.
- **A field instrument, not a generic admin template.** The map, the forecast and
  the next move are the product.
- **Calm under pressure.** One primary action, generous silence, no decorative
  metrics.
- **Honest by default.** Observed, derived and simulated data are labelled in the
  interface.

## 2. Type

Satoshi is the only family. The display and interface faces are the same.

| Role | Size | Use |
|---|---|---|
| Page title | 32–44px, 500, `-0.045em` | One per page, sentence case, ending with a full stop where it reads naturally. |
| Panel title | 14–17px, 500 | Card titles, the one thing the panel is about. |
| Body | 11–13px | Descriptions, explanatory copy, table content. |
| Label | 8–10px, 600, uppercase, `0.14em` | Field labels, chart axes, eyebrows. |
| Number | 24–44px, 500, `-0.04em`, tabular | Metrics and forecast quantities. |

Rules:

- Do not bold the display face. Use scale and space.
- Tables use tabular numerals.
- Avoid more than two type sizes inside one small card.

## 3. Colour

Defined in `web/src/app/globals.css` under `@theme`.

| Token | Hex | Use |
|---|---|---|
| `bone` / `paper` | `#d2cac7` | Page ground and landing base. |
| `surface` | `#e3dcd7` | Standard cards on the bone ground. |
| `panel` | `#ece6e1` | Popovers, inset controls, tooltips. |
| `sand` | `#ccb7a3` | Warm emphasis, data bands, selected states. |
| `clay` | `#8e775c` | Forecast lines, secondary data, watch states. |
| `ink` | `#190f0a` | Primary text, dark cards, sidebar, primary actions. |
| `body` | `#492415` | Strong body copy. |
| `muted` | `#6c4833` | Supporting copy and labels. |
| `line` | `#bcb1aa` | 1px hairlines. |
| `ok` | `#3d5a3f` | Stable stock. |
| `warn` | `#7a4a17` | High risk, expiry, approvals. |
| `danger` | `#8b2f1f` | Critical stockout risk and destructive actions. |

There is no teal, cool blue or mint in the application palette. Colour changes
at section boundaries, not inside a small block. Large fields stay flat. Avoid
gradients except the live map wash and the uncertainty band.

## 4. Shape and surface

- Cards: `16px` radius, 1px `line` border, `surface` fill, no decorative shadow.
- Inset controls and popovers: `panel`, `12–14px` radius.
- Actions: pills. Primary is ink/bone; secondary is a hairline pill; the primary
  page action adds a circular arrow chip, carried over from the landing page.
- Status pills are annotations, not buttons. Keep them small and tinted.
- Use hairlines and space instead of nested tinted boxes.
- A dark card is a deliberate contrast moment, not a default. The network
  dashboard uses exactly one for the next best move.

## 5. Shell

- Desktop sidebar: ink ground, `248px` expanded, `76px` collapsed.
- The collapsed state is persisted in the `sentry_sidebar` cookie.
- Active navigation is a full bone pill with ink text and a small dot.
- Section labels are uppercase micro-labels; collapsed sections become hairlines.
- Bottom user block opens `/account`.
- Top bar: 60px, sticky, translucent bone, breadcrumb on the left, utilities on
  the right.
- Mobile navigation is a left drawer with a backdrop and a close button. There
  are no horizontal navigation chips.
- One-line footer only. Do not repeat the full data disclaimer on every page.

## 6. Network dashboard

Composition, top to bottom:

1. Page header with one primary action.
2. Four-metric strip divided by hairlines.
3. Live facility map (8 columns) with the next best move and pipeline/assurance
   (4 columns).
4. Forecast explorer (7 columns) and risk horizon (5 columns).

The map and risk horizon share a selection. Clicking a facility filters the risk
rows and loads the first relevant forecast. Clicking a risk row focuses that
facility and medicine in the forecast explorer. The next move can reveal its
route on the map.

Do not add a separate alerts card, a demand-signals card, repeated facility
tiles, or a second transfer list. The page should fit in one decision loop:
**pressure → forecast → action**.

## 7. Facility and Today

- Facilities: forecast explorer and coverage in the first row; the medicine
  register spans the full width underneath.
- Today: work queue and audit trail; approvals and expiry appear only when
  something is actually waiting. If both are clear, use one compact all-clear
  strip instead of two empty cards.
- Remove metadata cards that repeat the page header.

## 8. Charts and map

- Forecast: ink actual line, clay dashed forecast, sand 80% band, dotted
  horizontal grid, no chart border, no vertical axis line. Always show a legend.
- Risk horizon: dot plot. Every at-risk line gets a row, banded at 7, 14 and 30
  days. Dots are keyboard-focusable and clickable.
- Signals: small warm line/area charts, never the default Recharts look.
- Map: Leaflet with Esri World Light Gray tiles, warmed through CSS to sit on the
  bone ground. Use custom div-icon markers, custom zoom controls, a dashed route
  and visible OSM/Esri attribution. Facility coordinates come from the seeded
  facility records; the basemap is a live external service, so markers and
  routes must remain usable if tiles fail.
- Never rely on hover alone for information. Selected states have visible text.

## 9. Motion and accessibility

- Motion is functional: sidebar width, drawer slide, marker selection, chart
  draw-in, hover crosshair.
- Respect `prefers-reduced-motion`.
- Charts have text summaries or accessible labels; markers and rows are real
  buttons or focusable elements.
- Every icon-only button has an `aria-label`.
- The app is always behind sign-in; the landing page remains public.

## 10. Voice

- Short declarative sentences. Concrete numbers.
- Prefer “shelf”, “facility”, “batch”, “cover” over platform jargon.
- Name the limitation before the user finds it.
- Never claim clinical validation or that the demo proves real-world impact.
