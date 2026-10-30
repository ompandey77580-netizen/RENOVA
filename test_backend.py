"""
Test script for Renova backend and SQLite database
"""
import urllib.request
import json
import time
import threading
import sys
from server import RenovaRequestHandler, PORT, get_db
import http.server

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

TEST_PORT = 3090

def run_test_server():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", TEST_PORT), RenovaRequestHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server

def test_endpoints():
    server = run_test_server()
    time.sleep(0.5)

    base = f"http://127.0.0.1:{TEST_PORT}"
    
    # 1. Health
    with urllib.request.urlopen(f"{base}/api/health") as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Health Check:", data["ok"], data["service"], "Records:", data["records"])
        assert data["ok"] is True
        assert data["database"] == "sqlite3"

    # 2. Contractors list
    with urllib.request.urlopen(f"{base}/api/contractors?trade=Electrician&minRating=4.5") as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Filter Contractors:", data["count"], "contractors found")
        assert data["ok"] is True
        assert data["count"] > 0

    # 3. Materials
    with urllib.request.urlopen(f"{base}/api/materials?category=Paints") as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Materials:", data["count"], "materials found")
        assert data["ok"] is True

    # 4. Stats
    with urllib.request.urlopen(f"{base}/api/stats") as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Stats:", data["stats"])
        assert data["ok"] is True

    # 5. Estimate POST
    req = urllib.request.Request(
        f"{base}/api/estimate",
        data=json.dumps({"room": "kitchen", "area": 250, "quality": "premium", "works": ["flooring", "painting"]}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Estimate Saved ID:", data["estimateId"], data["estimate"]["rangeText"])
        assert data["ok"] is True
        assert data["estimateId"] is not None

    # 6. Login
    req = urllib.request.Request(
        f"{base}/api/login",
        data=json.dumps({"email": "demo@renova.in", "password": "demo123"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Login:", data["message"], "User:", data["user"]["name"])
        assert data["ok"] is True

    # 7. Advisor Chat
    req = urllib.request.Request(
        f"{base}/api/chat",
        data=json.dumps({"message": "What is the cost of remodeling a kitchen?"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Smart Advisor Reply:", data["reply"][:50], "...")
        assert data["ok"] is True

    # 8. Newsletter
    req = urllib.request.Request(
        f"{base}/api/newsletter",
        data=json.dumps({"email": "student@college.edu"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Newsletter Subscribe:", data["message"], "Total:", data["total"])
        assert data["ok"] is True

    # 9. Book Contractor
    req = urllib.request.Request(
        f"{base}/api/book",
        data=json.dumps({
            "contractorId": 1,
            "name": "Aman Sharma",
            "email": "aman@example.com",
            "phone": "9876543210",
            "date": "2026-11-05",
            "notes": "Need inspection for full apartment rewiring"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode("utf-8"))
        print("[OK] Booking:", data["message"], "Booking ID:", data["bookingId"])
        assert data["ok"] is True

    print("\n=======================================================")
    print("SUCCESS: ALL BACKEND API ENDPOINTS ROUTED TO SQLITE!")
    print("=======================================================\n")
    server.shutdown()

if __name__ == "__main__":
    test_endpoints()
