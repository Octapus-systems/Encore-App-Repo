# Encore Executive — App Test Report

**Date:** 9 Nov 2026 · **Build:** `Encore-Executive-debug.apk` (rebuilt after fixes) · **Server:** live (encore-api-iota.vercel.app)
**How tested:** app run in a phone-size browser (375×812) against the live server, logged in as a customer (Charlotte, corporate) and a driver (Oliver). Not run on a physical phone — none connected.

## Result: PASS (3 issues found and fixed)

### Page speed (cold load, to fully shown)
| Page | Time | Errors | Content jumps |
|---|---|---|---|
| Home | 0.55 s | none | fixed (was bad) |
| Trips | 0.45 s | none | none |
| Book a ride | 0.55 s | none | none |
| Profile | 0.44 s | none | none |
| Invoices | 0.45 s | none | none |
| Notifications / Updates | 0.45 s | none | none |
| Fleet | 0.46 s | none | none |
| Company team | 0.45 s | none | none |
| Corporate upgrade | 0.55 s | none | none |
| Journey details (3 trips) | 0.47–1.7 s | none | none |
| Driver: My journeys | 0.54 s | none | none |
| Driver: Updates / Account | 0.44 s | none | none |
| Driver: Job details | 0.47 s | none | none |

Target: under 1 s. All pages pass except one journey page at 1.7 s (waits on the server).

### Map
- Live journey map shows in **~1.0 s** when opened directly; faster from Home (map is pre-loaded in the background).
- Map style, fonts and icons ship inside the app; only map tiles download.
- Pinch/zoom smooth (GPU map).

### Smoothness
- Scrolling Home: **0 dropped frames**, no long freezes.
- Layout jumps (Google "CLS", good < 0.1): every page **≤ 0.009** after fix.

### Buttons
- Every button and link on all 18 screens checked: **all have an action** — no dead buttons.
- Booking flow tested by hand: Where to? → airport shortcut → address search → pick result → trip type, time, passengers, car → all respond.

## Fixed
1. **Home screen jumped** when trips loaded (sections pushed down 252 px — score 0.19). Now a placeholder holds the space → 0.008.
2. **Two cars selected at once** — S-Class and BMW 7 Series (same class) both showed ✓ and "Best fit". Now only the tapped car is selected, one "Best fit", and the chosen model is sent to Encore ("Preferred car: BMW 7 Series").
3. **Broken "image" boxes** on cars without a photo (BMW 7 Series, Land Cruiser) — showed dashed boxes with file names. Now a clean car icon.

## Not fixed — needs a decision / data
- **Address search takes 0.7–1.9 s** per search (free map service, server in Germany). OK, but slower than Google. Faster options: paid Google Places again, or self-host search.
- **Fleet name typo:** "Toyotta Land Cruiser" → fix in Command Center → Fleet. BMW 7 Series and Land Cruiser have **no photos** — upload in Command Center.
- **Old test trips** (21 Oct, 26 Oct) still show as "Upcoming" — test data; complete or cancel them in Command Center.
- **Driver test login** james@encore.test no longer works on live (password changed) — fine if intended.
- **Not tested:** real phone (GPS, push notifications, camera upload, back button) and payment. Need a phone connected by USB.
