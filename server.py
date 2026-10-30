"""
RENOVA — High Performance Backend Server (Python + SQLite)
"Renovate smarter. Build better."

Zero extra pip packages required — uses standard library:
http.server, sqlite3, json, urllib.parse, os, sys
"""

import http.server
import json
import os
import re
import sqlite3
import sys
import urllib.parse
from datetime import datetime

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db", "renova.db")
STATIC_DIR = BASE_DIR

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# --- Cost Estimator Calculation Rules ---
BASE_RATES = {
    "kitchen": 1200,
    "bathroom": 1500,
    "bedroom": 800,
    "living-room": 900,
    "full-home": 1000
}
QUALITY_MULT = {"standard": 1.0, "premium": 1.35, "luxury": 1.8}
WORK_ADDONS = {"flooring": 250, "painting": 120, "plumbing": 180, "electrical": 200, "carpentry": 220}

def rupee(n):
    return f"₹{int(round(n)):,}"

def compute_estimate(data):
    room = data.get("room", "full-home")
    if room not in BASE_RATES:
        room = "full-home"
    try:
        area = max(20.0, min(5000.0, float(data.get("area", 0))))
    except (ValueError, TypeError):
        area = 20.0

    quality = data.get("quality", "standard")
    if quality not in QUALITY_MULT:
        quality = "standard"

    works = data.get("works", [])
    if isinstance(works, str):
        works = [w.strip() for w in works.split(",") if w.strip()]
    works = [w for w in works if w in WORK_ADDONS]

    area_min = area
    area_max = area * 1.18
    base_cost = BASE_RATES[room] * area * QUALITY_MULT[quality]

    breakdown = {}
    add_min = 0.0
    add_max = 0.0
    for w in works:
        addon_cost = WORK_ADDONS[w] * area
        breakdown[w] = addon_cost
        add_min += WORK_ADDONS[w] * area_min
        add_max += WORK_ADDONS[w] * area_max

    if not breakdown:
        for k in ["flooring", "painting", "plumbing", "electrical", "carpentry"]:
            breakdown[k] = base_cost / 5.0
    else:
        breakdown["base"] = base_cost

    min_val = round(base_cost + add_min)
    max_val = round(base_cost + add_max)

    return {
        "room": room,
        "area": area,
        "quality": quality,
        "works": works,
        "min": int(min_val),
        "max": int(max_val),
        "rangeText": f"{rupee(min_val)} – {rupee(max_val)}",
        "breakdown": [{"key": k, "amount": int(round(v))} for k, v in breakdown.items()]
    }

# --- Smart Advisor Rules ---
def advisor_reply(message):
    q = str(message or "").lower()
    if any(k in q for k in ["cost", "price", "how much", "budget", "estimate"]):
        return ("For a 200 sq.ft kitchen remodel, you can expect a range of ₹1,80,000 to ₹3,40,000 depending "
                "on material quality and scope. Premium finishes (quartz counters, soft-close cabinetry) push it toward "
                "the upper end. I recommend trying our Cost Estimator for a tailored breakdown!")
    if any(k in q for k in ["material", "tile", "bathroom", "paint brand", "cement"]):
        return ("For bathrooms, I suggest anti-skid vitrified tiles for flooring, acrylic or engineered stone counter-tops, "
                "and a moisture-resistant PU paint on walls. Avoid laminates in wet zones. Check our Materials catalog "
                "to compare top brands like Kajaria and Asian Paints!")
    if any(k in q for k in ["painter", "contractor", "reliable", "hire", "book", "plumber", "electrician"]):
        return ("A reliable professional should have a verified trade license, 4.5+ rating with 50+ reviews, and a written quote. "
                "On Renova, navigate to Find Contractors, filter by your trade and toggle 'Verified only' to view vetted pros near you.")
    return ("Great question! I can help with cost estimates, material recommendations, contractor matching, and renovation planning. "
            "Could you tell me a bit more about your project — room type, size, and approximate budget?")

# --- Database Connection Helper ---
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class RenovaRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for frontend flexibility
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, status_code, data):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length == 0:
                return {}
            raw = self.rfile.read(length).decode("utf-8")
            return json.loads(raw)
        except Exception:
            return None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Route API requests
        if path.startswith("/api/"):
            return self.handle_api_get(path, query)

        # Serve static files
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/"):
            return self.handle_api_post(path)

        self.send_json(404, {"ok": False, "error": "Not found"})

    def handle_api_get(self, path, query):
        conn = get_db()
        c = conn.cursor()

        try:
            # 1. Health check
            if path == "/api/health":
                users_cnt = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
                contractors_cnt = c.execute("SELECT COUNT(*) FROM contractors").fetchone()[0]
                materials_cnt = c.execute("SELECT COUNT(*) FROM materials").fetchone()[0]
                estimates_cnt = c.execute("SELECT COUNT(*) FROM estimates").fetchone()[0]
                return self.send_json(200, {
                    "ok": True,
                    "service": "renova-api",
                    "database": "sqlite3",
                    "mode": "full-stack",
                    "database_path": DB_PATH,
                    "records": {
                        "users": users_cnt,
                        "contractors": contractors_cnt,
                        "materials": materials_cnt,
                        "estimates": estimates_cnt
                    },
                    "timestamp": datetime.now().isoformat()
                })

            # 2. Get contractors with filtering
            if path == "/api/contractors":
                sql = "SELECT * FROM contractors WHERE 1=1"
                params = []

                # Trade filter
                trades_param = query.get("trade", [""])[0]
                if trades_param:
                    trades = [t.strip() for t in trades_param.split(",") if t.strip()]
                    if trades:
                        placeholders = ",".join("?" for _ in trades)
                        sql += f" AND LOWER(trade) IN ({','.join('LOWER(?)' for _ in trades)})"
                        params.extend(trades)

                # Min rating filter
                min_rating = query.get("minRating", [""])[0]
                if min_rating:
                    try:
                        sql += " AND rating >= ?"
                        params.append(float(min_rating))
                    except ValueError:
                        pass

                # Verified filter
                verified = query.get("verified", [""])[0]
                if verified in ["1", "true"]:
                    sql += " AND verified = 1"

                # Price tier filter
                price = query.get("price", [""])[0]
                if price in ["budget", "mid", "premium"]:
                    sql += " AND price_tier = ?"
                    params.append(price)

                # Free text search query
                q = query.get("q", [""])[0].strip()
                if q:
                    sql += " AND (LOWER(name) LIKE ? OR LOWER(trade) LIKE ? OR LOWER(city) LIKE ? OR LOWER(area) LIKE ?)"
                    wildcard = f"%{q.lower()}%"
                    params.extend([wildcard, wildcard, wildcard, wildcard])

                # Sort
                sort_val = query.get("sort", ["rating"])[0]
                if sort_val == "reviews":
                    sql += " ORDER BY reviews DESC"
                else:
                    sql += " ORDER BY rating DESC"

                rows = c.execute(sql, params).fetchall()
                results = []
                for r in rows:
                    avail = []
                    if r["availability"]:
                        try:
                            avail = json.loads(r["availability"])
                        except Exception:
                            avail = []
                    results.append({
                        "id": r["id"],
                        "name": r["name"],
                        "trade": r["trade"],
                        "rating": float(r["rating"]),
                        "reviews": int(r["reviews"]),
                        "city": r["city"],
                        "area": r["area"],
                        "verified": bool(r["verified"]),
                        "priceTier": r["price_tier"],
                        "availability": avail,
                        "experience": r["experience"],
                        "about": r["about"]
                    })

                total = c.execute("SELECT COUNT(*) FROM contractors").fetchone()[0]
                return self.send_json(200, {
                    "ok": True,
                    "count": len(results),
                    "total": total,
                    "contractors": results
                })

            # 3. Single contractor profile
            if path.startswith("/api/contractors/"):
                try:
                    cid = int(path.split("/")[-1])
                    r = c.execute("SELECT * FROM contractors WHERE id = ?", (cid,)).fetchone()
                    if not r:
                        return self.send_json(404, {"ok": False, "error": "Contractor not found"})
                    avail = []
                    if r["availability"]:
                        try:
                            avail = json.loads(r["availability"])
                        except Exception:
                            avail = []
                    return self.send_json(200, {
                        "ok": True,
                        "contractor": {
                            "id": r["id"],
                            "name": r["name"],
                            "trade": r["trade"],
                            "rating": float(r["rating"]),
                            "reviews": int(r["reviews"]),
                            "city": r["city"],
                            "area": r["area"],
                            "verified": bool(r["verified"]),
                            "priceTier": r["price_tier"],
                            "availability": avail,
                            "experience": r["experience"],
                            "about": r["about"]
                        }
                    })
                except ValueError:
                    return self.send_json(400, {"ok": False, "error": "Invalid contractor ID"})

            # 4. Materials catalog
            if path == "/api/materials":
                cat = query.get("category", [""])[0].strip()
                if cat and cat.lower() != "all":
                    rows = c.execute("SELECT * FROM materials WHERE LOWER(category) = LOWER(?)", (cat,)).fetchall()
                else:
                    rows = c.execute("SELECT * FROM materials ORDER BY id ASC").fetchall()

                materials = [{
                    "id": r["id"],
                    "name": r["name"],
                    "category": r["category"],
                    "price": r["price"],
                    "rating": r["rating"],
                    "brand": r["brand"]
                } for r in rows]

                return self.send_json(200, {
                    "ok": True,
                    "count": len(materials),
                    "materials": materials
                })

            # 5. Platform Stats & Testimonials
            if path == "/api/stats":
                stats_rows = c.execute("SELECT key, value FROM stats").fetchall()
                stats = {r["key"]: r["value"] for r in stats_rows}
                test_rows = c.execute("SELECT * FROM testimonials").fetchall()
                testimonials = [{
                    "name": r["name"],
                    "project": r["project"],
                    "stars": r["stars"],
                    "quote": r["quote"]
                } for r in test_rows]
                return self.send_json(200, {
                    "ok": True,
                    "stats": stats,
                    "testimonials": testimonials
                })

            # 6. Saved estimates list
            if path == "/api/estimates":
                rows = c.execute("SELECT * FROM estimates ORDER BY created_at DESC LIMIT 20").fetchall()
                estimates = [{
                    "id": r["id"],
                    "room": r["room"],
                    "area": r["area"],
                    "quality": r["quality"],
                    "works": json.loads(r["works"]) if r["works"].startswith("[") else r["works"].split(","),
                    "min": r["min_cost"],
                    "max": r["max_cost"],
                    "createdAt": r["created_at"]
                } for r in rows]
                return self.send_json(200, {
                    "ok": True,
                    "count": len(estimates),
                    "estimates": estimates
                })

            # 7. Bookings list
            if path == "/api/bookings":
                rows = c.execute("SELECT * FROM bookings ORDER BY created_at DESC").fetchall()
                bookings = [{
                    "id": r["id"],
                    "contractorId": r["contractor_id"],
                    "contractorName": r["contractor_name"],
                    "customerName": r["customer_name"],
                    "customerEmail": r["customer_email"],
                    "customerPhone": r["customer_phone"],
                    "serviceDate": r["service_date"],
                    "notes": r["notes"],
                    "status": r["status"],
                    "createdAt": r["created_at"]
                } for r in rows]
                return self.send_json(200, {
                    "ok": True,
                    "count": len(bookings),
                    "bookings": bookings
                })

            return self.send_json(404, {"ok": False, "error": f"Endpoint not found: {path}"})

        finally:
            conn.close()

    def handle_api_post(self, path):
        body = self.parse_body()
        if body is None:
            return self.send_json(400, {"ok": False, "error": "Invalid JSON in request body"})

        conn = get_db()
        c = conn.cursor()

        try:
            # 1. Estimate calculation and persistence
            if path == "/api/estimate":
                result = compute_estimate(body)
                c.execute("""
                    INSERT INTO estimates (room, area, quality, works, min_cost, max_cost, breakdown_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    result["room"],
                    result["area"],
                    result["quality"],
                    json.dumps(result["works"]),
                    result["min"],
                    result["max"],
                    json.dumps(result["breakdown"])
                ))
                conn.commit()
                estimate_id = c.lastrowid
                return self.send_json(201, {
                    "ok": True,
                    "estimateId": estimate_id,
                    "estimate": result,
                    "savedTo": "SQLite: db/renova.db"
                })

            # 2. Login authentication
            if path == "/api/login":
                email = str(body.get("email", "")).strip().lower()
                password = str(body.get("password", ""))
                if not EMAIL_RE.match(email) or not password:
                    return self.send_json(400, {"ok": False, "error": "Valid email and password are required"})

                user = c.execute("SELECT * FROM users WHERE LOWER(email) = ? AND password = ?", (email, password)).fetchone()
                if not user:
                    return self.send_json(401, {"ok": False, "error": "Invalid email or password. Try demo@renova.in / demo123"})

                return self.send_json(200, {
                    "ok": True,
                    "message": f"Welcome back, {user['name']}!",
                    "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]},
                    "token": f"renova-token-{user['id']}-{int(datetime.now().timestamp())}"
                })

            # 3. Signup user registration
            if path == "/api/signup":
                name = str(body.get("name", "")).strip()
                email = str(body.get("email", "")).strip().lower()
                password = str(body.get("password", ""))

                if len(name) < 2:
                    return self.send_json(400, {"ok": False, "error": "Name must be at least 2 characters"})
                if not EMAIL_RE.match(email):
                    return self.send_json(400, {"ok": False, "error": "Invalid email address format"})
                if len(password) < 6:
                    return self.send_json(400, {"ok": False, "error": "Password must be at least 6 characters"})

                existing = c.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
                if existing:
                    return self.send_json(409, {"ok": False, "error": "An account with this email already exists"})

                c.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (name, email, password))
                conn.commit()
                user_id = c.lastrowid
                return self.send_json(201, {
                    "ok": True,
                    "userId": user_id,
                    "message": f"Account created for {name}. You can sign in now."
                })

            # 4. Smart Advisor Chat
            if path == "/api/chat":
                message = str(body.get("message", "")).strip()
                if not message:
                    return self.send_json(400, {"ok": False, "error": "Message cannot be empty"})

                reply = advisor_reply(message)
                session_id = str(body.get("sessionId", "guest"))
                c.execute("INSERT INTO chats (session_id, message, reply) VALUES (?, ?, ?)", (session_id, message, reply))
                conn.commit()
                return self.send_json(200, {
                    "ok": True,
                    "reply": reply,
                    "logged": True
                })

            # 5. Newsletter Subscription
            if path == "/api/newsletter":
                email = str(body.get("email", "")).strip().lower()
                if not EMAIL_RE.match(email):
                    return self.send_json(400, {"ok": False, "error": "Please provide a valid email address"})

                try:
                    c.execute("INSERT INTO subscribers (email) VALUES (?)", (email,))
                    conn.commit()
                except sqlite3.IntegrityError:
                    pass  # Already subscribed

                total = c.execute("SELECT COUNT(*) FROM subscribers").fetchone()[0]
                return self.send_json(200, {
                    "ok": True,
                    "message": "Subscribed! Renovation tips incoming.",
                    "total": total
                })

            # 6. Contractor Booking
            if path == "/api/book":
                contractor_id = body.get("contractorId")
                customer_name = str(body.get("name", "")).strip()
                customer_email = str(body.get("email", "")).strip().lower()
                customer_phone = str(body.get("phone", "")).strip()
                service_date = str(body.get("date", "")).strip()
                notes = str(body.get("notes", "")).strip()

                if not customer_name:
                    return self.send_json(400, {"ok": False, "error": "Name is required"})
                if not EMAIL_RE.match(customer_email):
                    return self.send_json(400, {"ok": False, "error": "Valid email is required"})

                contractor_name = "Assigned Pro"
                if contractor_id:
                    c_row = c.execute("SELECT name FROM contractors WHERE id = ?", (contractor_id,)).fetchone()
                    if c_row:
                        contractor_name = c_row["name"]

                c.execute("""
                    INSERT INTO bookings (contractor_id, contractor_name, customer_name, customer_email, customer_phone, service_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (contractor_id, contractor_name, customer_name, customer_email, customer_phone, service_date, notes))
                conn.commit()
                booking_id = c.lastrowid
                return self.send_json(201, {
                    "ok": True,
                    "bookingId": booking_id,
                    "message": f"Booking request sent to {contractor_name}!"
                })

            return self.send_json(404, {"ok": False, "error": f"Endpoint not found: {path}"})

        finally:
            conn.close()

if __name__ == "__main__":
    from init_db import init_db
    init_db()

    server = http.server.ThreadingHTTPServer(("", PORT), RenovaRequestHandler)
    print(f"\n=======================================================")
    print(f"  🏠 Renova Backend Server running at: http://localhost:{PORT}")
    print(f"  🗄️  Connected to SQLite database:    {DB_PATH}")
    print(f"  📁 Serving frontend assets from:     {STATIC_DIR}")
    print(f"  📡 API Health Check:                 http://localhost:{PORT}/api/health")
    print(f"=======================================================\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()
