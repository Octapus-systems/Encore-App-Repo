# Encore Executive — Phase 1

Premium chauffeur booking and management platform, built to the **Encore Executive BRD v1.0 (11 Oct 2026)**.
One web app, three experiences:

| Experience | Path | Who |
|---|---|---|
| Customer (mobile-first) | `/app` | Private and corporate customers |
| Driver (mobile web portal) | `/driver` | Chauffeurs assigned by management |
| Management Command Center | `/admin` | Admin / dispatcher / management |

Stack: React 18 + Vite + Tailwind (Encore orange/black brand), Node 22+ Express API, SQLite via the built-in `node:sqlite` (no native build step). Every access rule is enforced on the server.

## Repositories

| Repo | Contents |
|---|---|
| [Encore-App-Repo](https://github.com/Octapus-systems/Encore-App-Repo) | Web app — customer, driver and management screens (this repo) |
| [Backend-App-Management](https://github.com/Octapus-systems/Backend-App-Management) | API server, database, business rules — clone into `./server` |

```bash
git clone https://github.com/Octapus-systems/Encore-App-Repo.git encore
cd encore
git clone https://github.com/Octapus-systems/Backend-App-Management.git server
```

## Run locally

```bash
npm install
npm run dev        # API on :4000, web on :5173 (proxied /api)
```

The first start creates `data/encore.db` and loads demo data. Reset it any time with `npm run seed`.

Demo accounts (password `Encore2026!` — development only):

| Role | Email |
|---|---|
| Management | admin@encore.test |
| Driver | james@encore.test, oliver@encore.test |
| Private customer | customer@encore.test |
| Corporate user (Hallam Partners LLP) | corporate@encore.test |
| Pending access request | pending@encore.test (cannot sign in until approved) |

## Production

```bash
npm run build
NODE_ENV=production JWT_SECRET=<long random string> PORT=8080 npm start
```

`npm start` serves the API and the built app from one process. Back up `data/encore.db` (or set `ENCORE_DB_FILE`).

Optional environment:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | **Required in production.** Signs sign-in tokens. |
| `GOOGLE_MAPS_API_KEY` | Google Routes API (server-side only). Adds distance, drive time and distance from base to each journey leg. Put it in `.env` (git-ignored). |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | WhatsApp Business Cloud API. Without them WhatsApp deliveries are logged as *not configured* (never as delivered). |
| `ENCORE_DB_FILE` / `ENCORE_DATA_DIR` | Database location. |
| `API_PORT` | API port in development (default 4000). |

## Tests

```bash
npm test     # business-rule tests against an in-memory database
npm run lint
```

Covered: lifecycle request → quote → accept → confirm → assign → four driver statuses → payment → close; acceptance never confirms; only management confirms; reference price/internal notes hidden from customers; driver isolation and no financial data for drivers; organisation isolation; conflict warning + recorded override; unavailable vehicles blocked; statuses in order and duplicate presses are no-ops; self-service cancellation blocked once en route; failed payments stay unpaid; one-hour reminder sent exactly once.

## How the BRD maps to the build

| BRD | Where |
|---|---|
| CUS-1 controlled access | Invitation links and/or management-approved registration (`Settings → Customer admission`); pending/rejected/suspended users cannot sign in |
| CUS-2 detailed request | `/app/request` — six journey types, stops, flight, hours, return leg, passengers, luggage, child seats, accessibility, preferred/larger vehicle, private chauffeur notes; per-type validation |
| CUS-3 quote response | Accept / decline / request change; acceptance shows "awaiting confirmation" |
| CUS-4 status, history, cancel | Progress tracker, vehicle registration after assignment, cancel until en route |
| CUS-5/6 payments, corporate | Payment status + provider link; corporate users see organisation bookings and invoices only |
| DRV-1/2 | Assigned legs only, brief, Google Maps link, call dispatcher/passenger, On the way → Arrived → Started → Completed |
| ADM-1 review/confirm | Review, clarification thread, edit (audited), explicit confirm (reason required if no accepted quote), reject |
| ADM-2 quotation | Internal reference price + extras + manual final price; customer sees only chosen lines and total; versioned history |
| ADM-3/4/5 fleet & dispatch | Vehicles (no limit, retire/unavailable), drivers & availability, suitability hints, conflict detection (duration + turnaround from settings), recorded override, external operators |
| ADM-6 payments & invoices | Payment arrangement, links, cash/external/failed payments, consolidated corporate invoices, overdue detection |
| ADM-7 notifications | In-app always; WhatsApp/email per settings with per-channel delivery status; one-hour reminder scheduler |
| ADM-8 dashboard | Decisions due, today, unassigned, conflicts, unpaid, access requests, undelivered messages; weekly calendar by day/driver |
| ADM-10 audit | Every booking, quote, assignment, payment, cancellation and status change records who and when; changes are transactional |

## Decisions taken where the BRD is still open (§19)

These are defaults, all changeable — please confirm with Encore:

1. **Platform** — responsive web app (installable on phones). Native iOS/Android wrappers not yet built.
2. **Driver delivery** — mobile web portal.
3. **Admission** — both invitation and approved registration enabled (setting).
4. **Payments** — provider-agnostic: management pastes a SumUp/Revolut/other payment link and records results. No card data touches Encore.
5. **Notifications** — automatic on each event; WhatsApp needs Business API credentials; email adapter not yet connected.
6. **Pricing** — no formula; optional reference price + extras + manual final price.
8. **Policies** — cancellation text is configurable; no fees are calculated.
10. **Quote validity** — 48 h (setting), shown to the customer; expiry is not automatic — management can mark a booking Expired.
11. **Conflicts** — 120 min default job length + 30 min turnaround (settings), per-leg override.
12. **Sign-in** — email + password; password reset is done by management (no email provider yet).
15. **Staff direct booking** — enabled (`New booking`), marked "created by staff" in history.

Times are shown in UK time (Europe/London).

The previous Base44 export (an Uber-style prototype with instant fares and auto-matching, which the BRD rules out) is kept untouched in `_legacy_base44/`.
