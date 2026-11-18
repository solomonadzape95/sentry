# Cheta brand and interface direction

Cheta is Igbo for **to remember**. The product is the memory of the medicine shelf:
a live record of what facilities hold and a forecast of what they will need before
the shelf is empty.

The landing page and the dashboard share one design language. This note records the
rules so the rebrand stays coherent as the dashboard is rebuilt.

## 1. Type

| Role | Family | Usage |
|---|---|---|
| Display | **Instrument Serif** (`font-display`) | Editorial headlines, large numbers, pull quotes. Weight 400, tight tracking. Italic for emphasis. |
| Interface | **Instrument Sans** | Body copy, labels, tables, forms, navigation. |
| Data | Instrument Sans `tabular` utility | Metrics, quantities, dates in tables. |

Rules:

- Headlines are sentences, not slogans in caps. Use a full stop where it reads well.
- Do not bold the serif. Scale and spacing carry the hierarchy.
- Labels are 9–10px, uppercase, `0.14em` tracking, muted ink.
- Body copy sits at 12–15px with generous line height (1.7–1.8).

## 2. Colour

Defined in `web/src/app/globals.css` under `@theme`.

| Token | Hex | Use |
|---|---|---|
| `paper` | `#f8f5ee` | Default page ground |
| `cream` | `#eeece5` | Footer panel, soft inset surfaces |
| `canvas` | `#f4f2ec` | Dashboard ground |
| `surface` | `#fdfcf8` | Cards, forms |
| `ink` | `#1c1c18` | Primary text, black CTA cards |
| `body` | `#3a3931` | Body text |
| `muted` / `stone` | `#6f6d64` | Secondary text |
| `line` | `#e2ded2` | Hairlines and card borders |
| `sage` | `#cee6cc` | Full-bleed brand section, header CTA |
| `sky` / `sky-soft` / `sky-deep` | `#a6dff0` / `#e4f9fc` / `#75d3eb` | Platform and forecast sections |
| `butter` / `butter-deep` | `#faedb4` / `#efd88e` | Primary CTA, product section, testimonials |
| `mint` | `#cff4d3` | Coordination section |
| `charcoal` | `#2c2c26` | Proof, trust surround, footer ground |
| `brand` | `#2f4a35` | Dashboard primary actions and data series |
| `ok` / `warn` / `danger` | `#2c6e49` / `#9a5a16` / `#a23a2c` | Semantic status |

Keep large fields flat. Colour changes at section boundaries, not inside a block.
Cards stay near-white on colour. Avoid gradients except inside artwork and the
occasional radial glow on the dashboard.

## 3. Shape, texture and layout

- **Square section edges.** Full-bleed colour blocks are the primary rhythm. No
  rounded page containers.
- **Small radii on UI only.** Cards and inputs use 8–14px. The landing product cards
  use 12px; dashboard cards use 14px.
- **Hairlines, not shadows.** Use 1px `line` borders. Reserve shadows for floating
  product cards (diffuse, low opacity).
- **Offset shadows for editorial cards.** Testimonials and case-study cards use a
  6px hard ink shadow and a slight rotation.
- **Print grain.** `print-grain`, `riso-speckle` and `dotfield` utilities add the
  risograph texture. Use them on large colour fields and artwork, never on form controls.
- **Asymmetry.** The hero uses a half-width artwork plate with a rectangular notch
  cut from its top-left. Product cards overlap panels and each other by a few pixels.
- **Generous silence.** Sections breathe. Do not fill every quadrant.

## 4. Placeholder artwork

`web/src/components/landing/artwork.tsx` renders four procedural plates:

| Variant | Used on | Composition |
|---|---|---|
| `meadow` | Hero, proof card | Sky, cloud bank, green hills, dark treeline, stream |
| `sky` | Platform section | Deep sky and textured cloud bank |
| `shore` | Closing CTA | Aerial water, foam bands, floating paper |
| `forest` | Footer | Dark forest edge, mist, water strip |

Each plate is a labelled placeholder. To replace with final imagery:

1. Add the asset to `web/public/art/` (e.g. `hero.jpg`, 2400×3000; `shore.jpg`,
   2400×1400; `forest.jpg`, 2800×1200).
2. In `Artwork`, replace the matching `<svg>` with
   `<Image src="/art/hero.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />`.
3. Keep the `print-grain` layers on top so photography keeps the printed feel.
4. Remove the “Placeholder artwork” labels in `page.tsx` and `site-footer.tsx`.

The artwork is decorative (`aria-hidden`); never put essential copy inside it.

## 5. Component patterns

- **Buttons:** flat rectangles. Butter for primary on light, ink for primary on
  colour/dark, sage for the header CTA. No pill buttons on the landing page.
- **Status pills:** tinted soft backgrounds (`ok-soft`, `warn-soft`, `danger-soft`)
  with 9px text. Keep them small; they are annotations, not buttons.
- **Cards:** bordered, 12–14px radius, white. A small label above a serif number is
  the standard metric pattern.
- **Charts:** ink line for actuals, `sky-ink` dashed line for forecast, `sky` 80%
  band, thin dashed gridlines, no chart chrome.

## 6. Dashboard carry-over

Already applied:

- Global palette, warm canvas, charcoal sidebar and butter accents.
- Instrument Sans/Serif and the serif page titles.
- New wordmark and app icons.
- 14px card radius and serif stat values.

Next passes:

1. Rework charts and the facility map to the Cheta chart palette (ink, sky, sage,
   butter) and remove the last cool teal fills.
2. Flatten the remaining dense cards: fewer shadows, hairline dividers, more space
   between metric and label.
3. Give the sidebar section labels and the demo-network block the editorial label
   treatment; reduce the number of nested tinted boxes.
4. Carry the header CTA language into empty states and page actions (one primary
   action, flat, clear).
5. Audit mobile screens for the same radius, label and status-pill rules.

## 7. Voice

- Short declarative sentences. Concrete numbers.
- Name the limitation before the reader finds it. “Simulated records”, “public
  disease signals”, “not real-world impact”.
- Never claim clinical validation, diagnosis, or that the demo proves stockout
  reduction.
- Prefer “shelf”, “facility”, “batch”, “cover” over platform jargon.
