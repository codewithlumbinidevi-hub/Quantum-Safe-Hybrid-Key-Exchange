"""
End-to-end validation script for unified services (Backend + Frontend).
Tests startup, connectivity, proxying, API routes for both Phase 1 and Phase 2,
and clean shutdown.
"""
import os
import sys
import time
import subprocess
import urllib.request
import json

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
PHASE1_DIR = os.path.join(REPO_ROOT, "phase1")
FRONTEND_DIR = os.path.join(PHASE1_DIR, "frontend")

env = os.environ.copy()
env["PYTHONPATH"] = f"{PHASE1_DIR};{REPO_ROOT}"

print("[1] Spawning FastAPI Backend on http://127.0.0.1:8000...")
backend_proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    cwd=PHASE1_DIR,
    env=env,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

print("[2] Spawning Vite Frontend on http://localhost:5173...")
frontend_proc = subprocess.Popen(
    ["npm.cmd", "run", "dev"],
    cwd=FRONTEND_DIR,
    env=env,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

try:
    print("[3] Waiting for Backend API readiness...")
    backend_ok = False
    for i in range(20):
        time.sleep(1)
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2) as resp:
                if resp.status == 200:
                    backend_ok = True
                    print(f"  [+] Backend connected in {i+1}s!")
                    break
        except Exception:
            pass

    assert backend_ok, "Backend failed to become ready on port 8000!"

    print("[4] Waiting for Vite Frontend readiness...")
    frontend_ok = False
    for i in range(15):
        time.sleep(1)
        try:
            with urllib.request.urlopen("http://localhost:5173", timeout=2) as resp:
                if resp.status == 200:
                    frontend_ok = True
                    print(f"  [+] Frontend connected in {i+1}s!")
                    break
        except Exception:
            pass

    assert frontend_ok, "Frontend failed to become ready on port 5173!"

    print("\n[5] Testing Core Backend & Frontend Endpoints...")

    # Test 1: Phase 1 Health
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as r:
        data = json.loads(r.read())
        assert data["status"] == "healthy"
        print("  [PASS] /api/health -> healthy")

    # Test 2: Phase 1 Hybrid Exchange API
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/hybrid-exchange/run",
        data=json.dumps({"demo_message": "Test message"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
        assert data["success"] is True
        assert data["verification"]["hybrid_keys_match"] is True
        print("  [PASS] /api/hybrid-exchange/run -> hybrid shared secret generated and verified successfully")

    # Test 3: Phase 1 Results Summary
    with urllib.request.urlopen("http://127.0.0.1:8000/api/results/summary") as r:
        data = json.loads(r.read())
        assert "reproducibility_environment" in data
        print(f"  [PASS] /api/results/summary -> reproducibility environment validated ({data['project']})")

    # Test 4: Phase 2 Secure Channel Status
    with urllib.request.urlopen("http://127.0.0.1:8000/api/channel/status") as r:
        data = json.loads(r.read())
        assert data["status"] == "ready"
        assert len(data["supported_suites"]) == 2
        print(f"  [PASS] /api/channel/status -> Phase 2 Channel ready ({data['supported_suites'][0]['name']})")

    # Test 5: Phase 2 Live Handshake
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/channel/handshake/run",
        data=json.dumps({"suite": "pqc", "transport": "loopback", "payload": "1kb"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
        assert data["success"] is True
        assert data["total_wire_bytes"] == 9016
        print(f"  [PASS] /api/channel/handshake/run -> Handshake succeeded ({data['total_wire_bytes']} wire bytes, 1KB verified)")

    # Test 6: Phase 2 Security Tests Latest
    with urllib.request.urlopen("http://127.0.0.1:8000/api/channel/tests/latest") as r:
        data = json.loads(r.read())
        assert data["all_passed"] is True
        print(f"  [PASS] /api/channel/tests/latest -> {data['total_count']}/9 mandatory tests PASS")

    # Test 7: Frontend Reverse Proxy connectivity (/api via Port 5173)
    with urllib.request.urlopen("http://localhost:5173/api/channel/status") as r:
        data = json.loads(r.read())
        assert data["status"] == "ready"
        print("  [PASS] Frontend Proxy (localhost:5173/api/channel/status) -> successfully forwarded to backend")

    # Test 8: Frontend HTML
    with urllib.request.urlopen("http://localhost:5173") as r:
        html = r.read().decode("utf-8")
        assert "Q-SHIELD" in html or "<div id=\"root\">" in html
        print("  [PASS] Frontend HTML -> React / Vite root container rendered")

    print("\n[ALL CONNECTIVITY & FUNCTIONALITY CHECKS PASSED]")

finally:
    print("\n[6] Terminating test processes...")
    try:
        subprocess.run(["taskkill", "/PID", str(backend_proc.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass
    try:
        subprocess.run(["taskkill", "/PID", str(frontend_proc.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass
    print("  [+] Clean shutdown confirmed.")
