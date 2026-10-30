/* ============================================================
   RENOVA — Backend Server (zero-dependency Node.js)
   "Renovate smarter. Build better."

   Run:  node server.js        →  http://localhost:3000
   Env:  PORT=4000 node server.js to change the port.

   No npm install needed — uses only Node.js built-in modules.
   Serves the frontend (same folder) + a JSON REST API that
   reads/writes the flat-file database at data/db.json.
   ============================================================ */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "db.json");
const PORT = process.env.PORT || 3000;

/* ---------------- tiny JSON-file database ---------------- */
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    console.error("[db] Could not read data/db.json:", e.message);
    return { users: [], contractors: [], materials: [], estimates: [], subscribers: [], chats: [] };
  }
}
function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

/* ---------------- cost-estimator maths (server-side) ---------------- */
const BASE_RATES = { kitchen: 1200, bathroom: 1500, bedroom: 800, "living-room": 900, "full-home": 1000 };
const QUALITY_MULT = { standard: 1, premium: 1.35, luxury: 1.8 };
const WORK_ADDONS = { flooring: 250, painting: 120, plumbing: 180, electrical: 200, carpentry: 220 };

function rupee(n) {
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
}

function computeEstimate(input) {
  const room = BASE_RATES[input.room] ? input.room : "full-home";
  const area = Math.min(Math.max(parseFloat(input.area) || 0, 20), 5000);
  const quality = QUALITY_MULT[input.quality] ? input.quality : "standard";
  const works = Array.isArray(input.works) ? input.works.filter((w) => WORK_ADDONS[w]) : [];

  const areaMin = area;
  const areaMax = area * 1.18; // ±9% site-condition range
  const baseCost = BASE_RATES[room] * area * QUALITY_MULT[quality];

  const breakdown = {};
  let addMin = 0, addMax = 0;
  works.forEach((w) => {
    breakdown[w] = WORK_ADDONS[w] * area;
    addMin += WORK_ADDONS[w] * areaMin;
    addMax += WORK_ADDONS[w] * areaMax;
  });
  if (Object.keys(breakdown).length === 0) {
    ["flooring", "painting", "plumbing", "electrical", "carpentry"].forEach((k) => (breakdown[k] = baseCost / 5));
  } else {
    breakdown.base = baseCost;
  }

  const min = baseCost + addMin;
  const max = baseCost + addMax;
  return {
    room, area, quality, works,
    min: Math.round(min), max: Math.round(max),
    rangeText: rupee(min) + " \u2013 " + rupee(max),
    breakdown: Object.keys(breakdown).map((k) => ({ key: k, amount: Math.round(breakdown[k]) })),
  };
}

/* ---------------- smart advisor canned brain ---------------- */
const REPLIES = {
  cost: "For a 200 sq.ft kitchen remodel, you can expect a range of \u20B9180,000 to \u20B9340,000 depending on material quality and scope. Premium finishes (quartz counters, soft-close cabinetry) push it toward the upper end. I'd recommend trying our Cost Estimator for a detailed breakdown!",
  materials: "For bathrooms, I suggest anti-skid vitrified tiles for flooring, acrylic or engineered stone counter-tops, and a moisture-resistant PU paint on walls. Avoid laminates in wet zones. Want me to shortlist 3 vendors near you?",
  painter: "A reliable painter will have a verified trade license, 4.5+ rating with 50+ reviews, and a written quote. On Renova, just head to Find Contractors, filter by 'Painter' and toggle 'Verified only'. I can also pin your top 3 matches if you share your city.",
  default: "Great question! I can help with cost estimates, material picks, contractor matching, and renovation planning. Could you tell me a bit more about your project \u2014 room type, size, and budget range?",
};
function advisorReply(message) {
  const q = String(message || "").toLowerCase();
  if (/(cost|price|how much|budget)/.test(q)) return REPLIES.cost;
  if (/(material|tile|bathroom|paint brand)/.test(q)) return REPLIES.materials;
  if (/(painter|contractor|reliable|hire|book)/.test(q)) return REPLIES.painter;
  return REPLIES.default;
}

/* ---------------- helpers ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy(); // 1 MB cap
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { resolve({ __parseError: true }); }
    });
    req.on("error", () => resolve({}));
  });
}

/* ---------------- API router ---------------- */
async function handleAPI(req, res, url) {
  const db = readDB();
  const p = url.pathname;
  const q = url.searchParams;
  const method = req.method;

  /* ---- GET /api/health ---- */
  if (method === "GET" && p === "/api/health") {
    return json(res, 200, { ok: true, service: "renova-api", mode: "full-stack", time: new Date().toISOString() });
  }

  /* ---- GET /api/contractors?trade=&minRating=&verified=&price=&avail=&q=&sort= ---- */
  if (method === "GET" && p === "/api/contractors") {
    let list = db.contractors.slice();

    const trades = (q.get("trade") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (trades.length) list = list.filter((c) => trades.includes(c.trade.toLowerCase()));

    const minRating = parseFloat(q.get("minRating"));
    if (!isNaN(minRating) && minRating > 0) list = list.filter((c) => c.rating >= minRating);

    if (q.get("verified") === "1" || q.get("verified") === "true") list = list.filter((c) => c.verified);

    const price = q.get("price");
    if (price && ["budget", "mid", "premium"].includes(price)) list = list.filter((c) => c.priceTier === price);

    const avail = (q.get("avail") || "").split(",").filter(Boolean);
    if (avail.length) list = list.filter((c) => avail.every((a) => (c.availability || []).includes(a)));

    const term = (q.get("q") || "").trim().toLowerCase();
    if (term) {
      list = list.filter((c) =>
        [c.name, c.trade, c.city, c.area].join(" ").toLowerCase().includes(term)
      );
    }

    const sort = q.get("sort");
    if (sort === "reviews") list.sort((a, b) => b.reviews - a.reviews);
    else if (sort === "nearest") { /* placeholder: no geo in demo — keeps original order */ }
    else list.sort((a, b) => b.rating - a.rating); // "Top Rated" default

    return json(res, 200, { ok: true, count: list.length, total: db.contractors.length, contractors: list });
  }

  /* ---- GET /api/contractors/:id ---- */
  let m = p.match(/^\/api\/contractors\/(\d+)$/);
  if (method === "GET" && m) {
    const c = db.contractors.find((x) => x.id === Number(m[1]));
    return c ? json(res, 200, { ok: true, contractor: c }) : json(res, 404, { ok: false, error: "Contractor not found" });
  }

  /* ---- GET /api/materials?category= ---- */
  if (method === "GET" && p === "/api/materials") {
    const cat = (q.get("category") || "").trim().toLowerCase();
    let list = db.materials;
    if (cat && cat !== "all") list = list.filter((x) => x.category.toLowerCase() === cat);
    return json(res, 200, { ok: true, count: list.length, materials: list });
  }

  /* ---- GET /api/stats ---- */
  if (method === "GET" && p === "/api/stats") {
    return json(res, 200, { ok: true, stats: db.stats, testimonials: db.testimonials });
  }

  /* ---- POST /api/estimate  { room, area, quality, works[] } ---- */
  if (method === "POST" && p === "/api/estimate") {
    const body = await readBody(req);
    if (body.__parseError) return json(res, 400, { ok: false, error: "Invalid JSON body" });
    const result = computeEstimate(body);
    const entry = {
      id: db.estimates.reduce((mx, e) => Math.max(mx, e.id), 0) + 1,
      createdAt: new Date().toISOString(),
      input: { room: result.room, area: result.area, quality: result.quality, works: result.works },
      min: result.min, max: result.max,
    };
    db.estimates.unshift(entry);
    db.estimates = db.estimates.slice(0, 50); // keep last 50
    writeDB(db);
    return json(res, 201, { ok: true, estimateId: entry.id, estimate: result, savedTo: "data/db.json" });
  }

  /* ---- GET /api/estimates ---- */
  if (method === "GET" && p === "/api/estimates") {
    return json(res, 200, { ok: true, count: db.estimates.length, estimates: db.estimates.slice(0, 10) });
  }

  /* ---- POST /api/login  { email, password } ---- */
  if (method === "POST" && p === "/api/login") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!EMAIL_RE.test(email) || !password) {
      return json(res, 400, { ok: false, error: "Valid email and password are required" });
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      return json(res, 401, { ok: false, error: "Invalid email or password. Try demo@renova.in / demo123" });
    }
    return json(res, 200, {
      ok: true,
      message: "Welcome back, " + user.name + "!",
      user: { name: user.name, email: user.email },
      token: "demo-token-" + Buffer.from(user.email).toString("base64url"),
    });
  }

  /* ---- POST /api/signup  { name, email, password } ---- */
  if (method === "POST" && p === "/api/signup") {
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (name.length < 2) return json(res, 400, { ok: false, error: "Name is too short" });
    if (!EMAIL_RE.test(email)) return json(res, 400, { ok: false, error: "Invalid email address" });
    if (password.length < 6) return json(res, 400, { ok: false, error: "Password must be at least 6 characters" });
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return json(res, 409, { ok: false, error: "An account with this email already exists" });
    }
    db.users.push({ name, email, password, createdAt: new Date().toISOString() });
    writeDB(db);
    return json(res, 201, { ok: true, message: "Account created for " + name + ". You can sign in now." });
  }

  /* ---- POST /api/chat  { message } ---- */
  if (method === "POST" && p === "/api/chat") {
    const body = await readBody(req);
    const message = String(body.message || "").trim();
    if (!message) return json(res, 400, { ok: false, error: "Message cannot be empty" });
    const reply = advisorReply(message);
    db.chats.unshift({ message, reply, at: new Date().toISOString() });
    db.chats = db.chats.slice(0, 50);
    writeDB(db);
    return json(res, 200, { ok: true, reply });
  }

  /* ---- POST /api/newsletter  { email } ---- */
  if (method === "POST" && p === "/api/newsletter") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json(res, 400, { ok: false, error: "Please enter a valid email" });
    if (!db.subscribers.includes(email)) {
      db.subscribers.push(email);
      writeDB(db);
    }
    return json(res, 200, { ok: true, message: "Subscribed!", total: db.subscribers.length });
  }

  /* ---- unknown API route ---- */
  return json(res, 404, { ok: false, error: "API route not found", hint: "See README.md for the API reference" });
}

/* ---------------- static file serving ---------------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
  ".webmanifest": "application/manifest+json",
};

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(ROOT, pathname));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("403 Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      return serveFile(res, path.join(filePath, "index.html"));
    }
    if (err) return serveFile(res, filePath);
    serveFile(res, filePath);
  });

  function serveFile(res, fp) {
    fs.readFile(fp, (err, data) => {
      if (err) {
        // styled 404 page
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(
          "<!DOCTYPE html><html><head><meta charset='utf-8'><title>404 — Renova</title>" +
          "<link href='https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap' rel='stylesheet'>" +
          "</head><body style=\"margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F3F4F6;font-family:'Poppins',sans-serif\">" +
          "<div style='text-align:center'><div style='font-size:64px'>🏠</div>" +
          "<h1 style='color:#111827;margin:8px 0'>404 — Page not found</h1>" +
          "<p style='color:#6B7280'>This page is still under renovation.</p>" +
          "<a href='/' style='display:inline-block;margin-top:16px;background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600'>Back to Home</a>" +
          "</div></body></html>"
        );
      }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      });
      res.end(data);
    });
  }
}

/* ---------------- server ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  if (url.pathname.startsWith("/api/")) {
    handleAPI(req, res, url).catch((e) => {
      console.error("[api] error:", e);
      json(res, 500, { ok: false, error: "Internal server error" });
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log("");
  console.log("  🏠  Renova server running:  http://localhost:" + PORT);
  console.log("  📡  API health check:       http://localhost:" + PORT + "/api/health");
  console.log("  📂  Serving frontend from:  " + ROOT);
  console.log("  🗄️  Database file:           " + DATA_FILE);
  console.log("");
});
