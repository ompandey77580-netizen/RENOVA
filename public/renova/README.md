# 🏠 Renova — Full-Stack Home Renovation Platform

> **Renovate smarter. Build better.**
> A complete college project: pure HTML/CSS/JS frontend + a zero-dependency Node.js backend with a JSON REST API and flat-file database.

---

## ⚡ Quick Start (60 seconds)

**Requirement:** only [Node.js](https://nodejs.org) (v14 or newer). Nothing else — **no `npm install` needed**.

```bash
node server.js
```

Then open **http://localhost:3000** 🎉

That's it. The same command works on Windows, macOS and Linux.
(Optional: change the port with `PORT=4000 node server.js`.)

> **Frontend-only mode:** you can also just double-click `index.html` — every page still works, and the site quietly switches to "static demo mode" (a small pill in the footer tells you which mode is active).

---

## 🔑 Demo Login

| Email           | Password   |
|-----------------|------------|
| `demo@renova.in` | `demo123`  |
| `priya@example.com` | `priya123` |

You can also create accounts via `POST /api/signup` (see API reference below).

---

## 📂 Project Structure

```
renova/
├── index.html              # Home page
├── find-contractors.html   # Contractor search + live API filters
├── cost-estimator.html     # Interactive calculator + server-side saving
├── inspiration.html        # Masonry gallery with filter tabs
├── materials.html          # Material catalog + compare table
├── how-it-works.html       # 4-step process + FAQ accordion
├── login.html              # Split login card with server auth
├── smart-advisor.html      # Chat UI powered by POST /api/chat
├── styles.css              # One shared design system (orange + grey)
├── script.js               # All frontend logic (API-aware, graceful fallback)
├── server.js               # ⭐ Zero-dependency Node.js backend
├── data/
│   └── db.json             # Flat-file database (users, contractors, materials…)
├── package.json            # npm scripts + metadata (no dependencies)
├── .gitignore
└── README.md
```

---

## 🧠 How the full-stack wiring works

1. `script.js` checks `GET /api/health` on page load.
2. **Backend running** → footer shows *"● Backend connected — full-stack mode"* and:
   - Find Contractors renders its cards **from the API** and every filter/search hits `GET /api/contractors`
   - Cost Estimator's **"Save this estimate"** button persists to the server (`POST /api/estimate`)
   - Login authenticates against the users in `data/db.json` (`POST /api/login`)
   - Smart Advisor replies come from the server (`POST /api/chat`) and are logged
   - Newsletter subscriptions are stored (`POST /api/newsletter`)
3. **No backend** (e.g. `file://` double-click) → everything falls back to client-side demo mode with zero errors.

All data is persisted to `data/db.json` — open it after playing with the site to see saved estimates, subscribers, users and chats.

---

## 📡 API Reference

Base URL: `http://localhost:3000` · All bodies are JSON. Test with curl, Postman or the browser.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/health` | Service health check |
| GET  | `/api/contractors` | List/filter contractors. Query params: `trade` (comma list), `minRating`, `verified=1`, `price` (budget/mid/premium), `avail` (week/visit), `q` (free text), `sort` (rating/reviews/nearest) |
| GET  | `/api/contractors/:id` | Single contractor profile |
| GET  | `/api/materials` | Material catalog, optional `?category=Cement` |
| GET  | `/api/stats` | Platform stats + testimonials |
| POST | `/api/estimate` | Calculate & **save** an estimate. Body: `{ "room": "kitchen", "area": 200, "quality": "premium", "works": ["flooring","painting"] }` |
| GET  | `/api/estimates` | Last 10 saved estimates |
| POST | `/api/login` | Body: `{ "email": "demo@renova.in", "password": "demo123" }` |
| POST | `/api/signup` | Body: `{ "name": "Asha", "email": "asha@x.com", "password": "secret1" }` |
| POST | `/api/chat` | Body: `{ "message": "What's the cost of remodeling a kitchen?" }` |
| POST | `/api/newsletter` | Body: `{ "email": "me@x.com" }` |

### Try it with curl

```bash
# Health
curl http://localhost:3000/api/health

# Filter: verified painters rated 4.5+, sorted by reviews
curl "http://localhost:3000/api/contractors?trade=Painter&minRating=4.5&verified=1&sort=reviews"

# Calculate + save an estimate
curl -X POST http://localhost:3000/api/estimate \
  -H "Content-Type: application/json" \
  -d '{"room":"kitchen","area":200,"quality":"premium","works":["flooring","painting"]}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@renova.in","password":"demo123"}'

# Ask the Smart Advisor
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Best materials for bathroom?"}'
```

### Cost formula (used by both the client preview and the server)

```
estimate = (baseRate × area × qualityMultiplier) + Σ(workAddon × area)

base rates  (₹/sq.ft):  kitchen 1200 · bathroom 1500 · bedroom 800 · living 900 · full-home 1000
quality mult:           standard ×1.0 · premium ×1.35 · luxury ×1.8
work add-ons (₹/sq.ft): flooring 250 · painting 120 · plumbing 180 · electrical 200 · carpentry 220
Displayed range: min … max where max uses area ×1.18 (±9% site-condition buffer)
```

---

## 🛠️ Tech Notes (for your viva)

- **Zero dependencies** — the backend uses only Node's built-in `http`, `fs` and `path` modules, so `node server.js` runs anywhere instantly. (Routing, JSON body parsing, MIME typing and path-traversal protection are all implemented by hand in ~300 readable lines.)
- **Flat-file JSON database** — `data/db.json` keeps the project portable (copy the folder = move the whole app). The server reads it per-request and writes it on mutations.
- **Progressive enhancement** — the frontend never breaks without the backend: `script.js` detects the API and degrades gracefully.
- **Security touches** — path-traversal guard on static serving, JSON body size cap, email validation, duplicate-email/409 handling, 401 on bad credentials.
- **Honest disclaimer** — passwords are stored in plain text and the auth token is a demo value. Fine for a college demo; a production app would hash passwords (bcrypt) and use real JWTs/sessions.

## ✅ Feature Checklist

- [x] Sticky header + mobile hamburger on all 8 pages
- [x] Sticky footer, pushed down naturally on long pages
- [x] Orange (#F97316) + grey palette, Poppins/Inter typography
- [x] Responsive mobile-first layout (verified at 375px, 768px, 1280px)
- [x] Live cost calculator with CSS bar-chart breakdown
- [x] Server-persisted estimates, subscribers, users and chat logs
- [x] API-driven contractor filtering (trade, rating, price, availability, verified)
- [x] Chat UI with typing indicator and server-side smart replies
- [x] Accessible: semantic HTML, alt text, focus states, aria labels

---

© 2025 Renova — built as a college project. Happy renovating! 🧡
