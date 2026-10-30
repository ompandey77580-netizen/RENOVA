# 🏠 Renova — Full-Stack Home Renovation Platform

> **Renovate smarter. Build better.**  
> A complete college mini-project featuring a responsive frontend, a high-performance Python & SQLite backend, and REST API routing for all platform features.

---

## ⚡ Quick Start (Run Locally)

**Requirement:** Python 3 (installed on your system). Zero extra packages or `pip install` needed!

1. Open your terminal in this folder.
2. Initialize and start the backend:
```bash
python server.py
```
3. Open **[http://localhost:3000](http://localhost:3000)** in your browser! 🎉

*(The server automatically initializes `db/renova.db` with all tables and sample data on startup.)*

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| User | `demo@renova.in` | `demo123` |
| User | `priya@example.com` | `priya123` |

*(You can also register brand new accounts via the Sign In / Sign Up form or `POST /api/signup`)*

---

## 🗄️ Database Architecture (SQLite: `db/renova.db`)

All features are routed directly to relational SQLite tables:

- **`users`**: User accounts, email authentication, hashed passwords, roles.
- **`contractors`**: Directory of plumbers, electricians, painters, carpenters, interior designers with ratings, verified badges, pricing tiers, and locations.
- **`materials`**: Catalog of cement, paint, tiles, wood, and plumbing supplies with unit pricing and brand details.
- **`estimates`**: Persistent history of renovation calculations (room type, area, materials, add-ons, minimum and maximum projected costs).
- **`chats`**: Conversations with the Smart Advisor for audit logging and advice history.
- **`subscribers`**: Newsletter subscription email lists.
- **`bookings`**: Customer appointments and site-visit requests booked with specific contractors.
- **`testimonials`** & **`stats`**: Verified customer reviews and platform performance figures.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status, database type (`sqlite3`), and record counts |
| `GET` | `/api/contractors` | Filter contractors by `trade`, `minRating`, `verified`, `price`, `avail`, or search `q` |
| `GET` | `/api/contractors/:id` | Individual contractor profile |
| `GET` | `/api/materials` | Building materials catalog with optional `?category=` filter |
| `GET` | `/api/stats` | Platform statistics and customer testimonials |
| `POST` | `/api/estimate` | Calculate and store estimate into SQLite `estimates` table |
| `GET` | `/api/estimates` | Retrieve recent saved estimates |
| `POST` | `/api/login` | Authenticate credentials against SQLite `users` table |
| `POST` | `/api/signup` | Register a new user into SQLite |
| `POST` | `/api/chat` | Smart AI renovation advisor with conversation logging |
| `POST` | `/api/newsletter` | Save email subscriber into SQLite `subscribers` table |
| `POST` | `/api/book` | Submit a booking request to SQLite `bookings` table |
| `GET` | `/api/bookings` | Retrieve submitted booking requests |

---

## 🌐 GitHub Pages & Deployment

- **GitHub Pages:** Serves the frontend web app (`index.html`, `styles.css`, `script.js`).
- When opened on GitHub Pages without a backend running, the app automatically switches to **Static Demo Mode** so evaluators and visitors experience full UI interactivity without errors.
- When running with `python server.py`, the app automatically switches to **Full-Stack Mode** with live SQLite database persistence!
