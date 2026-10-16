# AGENTS.md

## Project Context

Encore Executive Phase 1 — premium chauffeur booking platform (customer, driver, management). Requirements: Encore Executive BRD v1.0. Start with `README.md`.

## Layout

- `server/` — Express API on `node:sqlite`. `db.js` schema/helpers, `domain.js` access scoping, lifecycle and conflict rules, `routes/` endpoints, `scheduler.js` reminders/overdue, `seed.js` demo data.
- `src/` — React + Vite + Tailwind. `pages/customer.jsx`, `pages/driver.jsx`, `pages/admin/*`, shared UI in `components/common.jsx` and `components/booking.jsx`.
- `_legacy_base44/` — old Base44 export, reference only. Do not build from it.

## Working Notes

- `npm run dev` runs API (:4000) and web (:5173) together. `npm test` runs business-rule tests. `npm run lint` before finishing.
- Enforce every permission on the server (`domain.js` `scopeClause`/`canView`/`bookingView`). Never expose quote internals, payments or margins to drivers, or another organisation's data.
- Wrap multi-step writes in `tx()` and record changes with `audit()`.
- A customer accepting a quote must never confirm a booking — only management confirms.
