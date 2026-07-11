from datetime import date, timedelta

from app import app, db

with app.app_context():
    db.drop_all()
    db.create_all()

client = app.test_client()

r = client.post("/register", json={"username": "alex", "email": "alex@example.com", "password": "test1234"})
print("register:", r.status_code, r.get_json())
user_id = r.get_json()["id"]

r = client.post("/login", json={"username": "alex", "password": "test1234"})
print("login (correct):", r.status_code, r.get_json())

r = client.post("/login", json={"username": "alex", "password": "wrong"})
print("login (wrong):", r.status_code, r.get_json())

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

r = client.get(f"/users/{user_id}/logs")
print("logs (last 7):", r.status_code, len(r.get_json()), "entries")

r = client.get(f"/users/{user_id}/coach-check")
print("coach-check:", r.status_code, r.get_json())

r = client.get(f"/users/{user_id}/logs")
print("logs (default days=7):", r.status_code, r.get_json())

r = client.get(f"/users/{user_id}/logs?days=3")
print("logs (days=3):", r.status_code, r.get_json())

# 404 check for a user that doesn't exist
r = client.get("/users/999/coach-check")
print("coach-check (missing user):", r.status_code)
