"""
Renova Database Initializer
Creates SQLite schema and seeds data from db.json
"""
import sqlite3
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db", "renova.db")
SEED_JSON = os.path.join(BASE_DIR, "public", "renova", "data", "db.json")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Enable foreign keys
    c.execute("PRAGMA foreign_keys = ON;")

    # 1. Users table
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Contractors table
    c.execute("""
    CREATE TABLE IF NOT EXISTS contractors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        trade TEXT NOT NULL,
        rating REAL DEFAULT 5.0,
        reviews INTEGER DEFAULT 0,
        city TEXT NOT NULL,
        area TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        price_tier TEXT DEFAULT 'mid',
        availability TEXT,
        experience TEXT,
        about TEXT,
        phone TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Materials table
    c.execute("""
    CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price TEXT NOT NULL,
        rating TEXT,
        brand TEXT,
        in_stock INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Estimates table
    c.execute("""
    CREATE TABLE IF NOT EXISTS estimates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        room TEXT NOT NULL,
        area REAL NOT NULL,
        quality TEXT NOT NULL,
        works TEXT NOT NULL,
        min_cost INTEGER NOT NULL,
        max_cost INTEGER NOT NULL,
        breakdown_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    """)

    # 5. Chats table (Smart Advisor)
    c.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        message TEXT NOT NULL,
        reply TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Subscribers table (Newsletter)
    c.execute("""
    CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 7. Bookings table
    c.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contractor_id INTEGER,
        contractor_name TEXT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT,
        service_date TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE SET NULL
    );
    """)

    # 8. Stats table
    c.execute("""
    CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    # 9. Testimonials table
    c.execute("""
    CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        project TEXT NOT NULL,
        stars INTEGER DEFAULT 5,
        quote TEXT NOT NULL
    );
    """)

    # Indexes for fast search
    c.execute("CREATE INDEX IF NOT EXISTS idx_contractors_trade ON contractors(trade);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_contractors_city ON contractors(city);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_contractors_rating ON contractors(rating);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);")

    conn.commit()

    # Load seed data if available
    if os.path.exists(SEED_JSON):
        with open(SEED_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Seed users
        c.execute("SELECT COUNT(*) FROM users")
        if c.fetchone()[0] == 0:
            for u in data.get("users", []):
                c.execute(
                    "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)",
                    (u.get("name"), u.get("email").lower(), u.get("password"), u.get("createdAt"))
                )

        # Seed contractors
        c.execute("SELECT COUNT(*) FROM contractors")
        if c.fetchone()[0] == 0:
            for item in data.get("contractors", []):
                c.execute("""
                    INSERT INTO contractors (id, name, trade, rating, reviews, city, area, verified, price_tier, availability, experience, about)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item.get("id"),
                    item.get("name"),
                    item.get("trade"),
                    item.get("rating"),
                    item.get("reviews"),
                    item.get("city"),
                    item.get("area"),
                    1 if item.get("verified") else 0,
                    item.get("priceTier", "mid"),
                    json.dumps(item.get("availability", [])),
                    item.get("experience"),
                    item.get("about")
                ))

        # Seed materials
        c.execute("SELECT COUNT(*) FROM materials")
        if c.fetchone()[0] == 0:
            for m in data.get("materials", []):
                c.execute("""
                    INSERT INTO materials (id, name, category, price, rating, brand)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    m.get("id"),
                    m.get("name"),
                    m.get("category"),
                    m.get("price"),
                    m.get("rating"),
                    m.get("brand")
                ))

        # Seed stats
        stats = data.get("stats", {})
        for k, v in stats.items():
            c.execute("INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)", (k, str(v)))

        # Seed testimonials
        c.execute("SELECT COUNT(*) FROM testimonials")
        if c.fetchone()[0] == 0:
            for t in data.get("testimonials", []):
                c.execute("""
                    INSERT INTO testimonials (name, project, stars, quote)
                    VALUES (?, ?, ?, ?)
                """, (
                    t.get("name"),
                    t.get("project"),
                    t.get("stars", 5),
                    t.get("quote")
                ))

        conn.commit()

    print(f"Database successfully initialized at: {DB_PATH}")
    
    # Print summary
    for tbl in ["users", "contractors", "materials", "estimates", "chats", "subscribers", "bookings", "testimonials"]:
        count = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        print(f"  - {tbl}: {count} records")

    conn.close()

if __name__ == "__main__":
    init_db()

