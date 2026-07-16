# ------------------------------------------------------
# quick_test.py — Manual Sanity Check
# ------------------------------------------------------
# Not a real test suite, just a script that exercises the
# API end to end and prints what happened, run by hand
# while working on this rather than wired into CI. Turn
# this into proper pytest cases if that's useful for
# the report
# ------------------------------------------------------

from datetime import date, timedelta

from app import app, db

with app.app_context():
    db.drop_all()
    db.create_all()

client = app.test_client()

r = client.post("/register", json={
    "username": "alex", "email": "alex@example.com", "password": "test1234", "theme_color": "emerald",
})
print("register:", r.status_code, r.get_json())
user_id = r.get_json()["id"]

r = client.post("/login", json={"username": "alex", "password": "test1234"})
print("login (correct):", r.status_code, r.get_json())

r = client.post("/login", json={"username": "alex", "password": "wrong"})
print("login (wrong):", r.status_code, r.get_json())

r = client.patch(f"/users/{user_id}/settings", json={"theme_color": "sapphire", "coaching_style": "direct"})
print("settings update:", r.status_code, r.get_json())

# A CORS regression check. If Access-Control-Allow-Origin ever goes
# missing again, the web app breaks with the exact "could not reach
# the server" symptom this was built to catch, better to see it fail
# here than hear about it from a confused bug report again.
r = client.post(
    "/register",
    json={"username": "cors_check", "email": "cors@example.com", "password": "test1234"},
    headers={"Origin": "http://localhost:8081"},
)
cors_header = r.headers.get("Access-Control-Allow-Origin")
print("CORS header present:", cors_header is not None, f"(value: {cors_header})")

today = date.today()

# 10 normal nights, then 3 short nights in a row, to check the streak detector fires
for i in range(10):
    day = today - timedelta(days=12 - i)
    r = client.post("/logs", json={
        "user_id": user_id, "log_date": day.isoformat(),
        "sleep_hours": 7.5, "steps": 8000, "mood": 4, "study_hours": 3,
    })
    assert r.status_code == 201, r.get_json()

for i in range(3):
    day = today - timedelta(days=2 - i)
    r = client.post("/logs", json={
        "user_id": user_id, "log_date": day.isoformat(),
        "sleep_hours": 4.5, "steps": 8000, "mood": 3, "study_hours": 5,
    })
    assert r.status_code == 201, r.get_json()

r = client.get(f"/users/{user_id}/coach-check")
print("coach-check:", r.status_code, r.get_json())

r = client.get(f"/users/{user_id}/logs")
print("logs (default days=7):", r.status_code, r.get_json())

r = client.get(f"/users/{user_id}/logs?days=3")
print("logs (days=3):", r.status_code, r.get_json())

# 404 check for a user that doesn't exist
r = client.get("/users/999/coach-check")
print("coach-check (missing user):", r.status_code)
