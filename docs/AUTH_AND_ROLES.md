# Authentication, roles and dashboards

Decisions taken on 18 Nov 2026.

## Model

Authorisation has two separate axes:

- **Scope** — which data a person can see: the whole network, one facility, or
  their own supplier orders.
- **Role** — what a person can do inside that scope.

`User.role` is a denormalised primary role for display and the demo seed. It is
not the source of truth for authorisation. `FacilityMember.role` is authoritative
for facility-scoped actions. Network authority and supplier accounts have no
facility membership.

The demo persona cookie is only honoured when `APP_PROFILE=demo` and
`AUTH_REQUIRED` is not true. In any other configuration the app requires an
Auth.js session. Use `AUTH_REQUIRED=true` with `APP_PROFILE=demo` to test the real
login wall against the demo dataset.

## Groups

| Group | Scope | Core job | Home |
|---|---|---|---|
| Inventory officer | Assigned facility/facilities | Record stock accurately | `/today`, `/m` |
| Facility manager | Their facility | Run the facility, approve dispatch, confirm receipt, report | `/facilities/[id]` |
| Network authority | Whole network | Coordinate redistribution, approve overrides, assure data and model quality | `/dashboard` |
| Supplier | Own purchase orders | Fulfil orders (portal deferred) | `/supplier` |

The supplier role exists and is denied internal data, but the purchase-order
portal is deferred. Analyst/auditor and network-administrator are capabilities
of the network authority until a pilot needs separate accounts.

## Capabilities

Capabilities live in `web/src/lib/authz.ts` and are the only place role checks
should be encoded.

| Capability | Inventory officer | Facility manager | Network authority | Supplier |
|---|---|---|---|---|
| `inventory:write` | yes | yes | yes | no |
| `transfer:request` | no | yes | yes | no |
| `transfer:approve` | no | yes (source) | yes | no |
| `transfer:receive` | no | yes (destination) | yes | no |
| `network:view` | no | no | yes | no |
| `facility:view` | own | own | all | no |
| `admin:manage` | no | no | yes | no |
| `data:view` | no | no | yes | no |
| `model:view` | no | no | yes | no |
| `supplier:view` | no | no | no | own |

## Transfer approvals

Two-party control:

1. A network authority or the source facility manager requests a transfer.
2. The **source** facility manager approves dispatch. Stock is deducted and the
   transfer becomes `IN_TRANSIT`.
3. The **destination** facility manager confirms receipt. Stock is added and the
   transfer becomes `COMPLETED`.

A network authority may act on either side. Every action is written to
`AuditLog`. The demo retains single-manager facilities, so a source manager can
request and then approve. Production should add maker-checker: a requester cannot
approve their own request unless an override reason is recorded, and an override
is audited.

## Auth surface

Invite-only. There is no public sign-up.

- `/sign-in` — email and password.
- `/forgot-password` — always says a link was sent.
- `/reset-password?token=…` — set a new password, revokes all sessions.
- `/invite/[token]` — accept an invitation and set a password.
- `/account` — profile, password change, sign out all devices.
- `/admin/users` — invite, suspend and change roles (network authority only).

Auth.js v5 with the Prisma adapter and JWT sessions. The JWT carries the user id,
role and a session epoch. Every server request re-reads the user from the database
and rejects suspended users or a stale epoch, so suspension, password changes and
role changes revoke access immediately.

Email delivery is stubbed in the demo profile: invite and reset links are logged
server-side and returned to the admin UI. Production must configure `RESEND_API_KEY`
or SMTP and never return tokens to the browser.

## Dashboards

One application, three role homes, not four separate apps.

- **Inventory officer — `/today`** is a work queue: scan, issue, receive, count;
  at-risk lines, expiring batches, failed syncs, recent movements. Inline days of
  cover only, no analytics.
- **Facility manager — `/facilities/[id]`** is facility health plus an approvals
  inbox: dispatch requests, receipts in transit, critical alerts, expiry exposure,
  staff activity and reporting.
- **Network authority — `/dashboard`** is the command centre: network risk map,
  stockout radar, surplus-to-shortage opportunities, transfer pipeline, model and
  data assurance, and the admin console.
- **Supplier — `/supplier`** is a deferred stub: orders only, no facility stock or
  consumption data.

Login redirects through `/home`, which resolves to the role home. Navigation is
derived from capabilities, not a separate hard-coded map.
