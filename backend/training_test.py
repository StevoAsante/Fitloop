# ------------------------------------------------------
# training_test.py — Manual Check for the Gym API
# ------------------------------------------------------
# Same idea as quick_test.py: walks the workout routes end
# to end against a throwaway database and asserts the bits
# that are easy to get subtly wrong (records, progression,
# the plan). Run it by hand with `python training_test.py`,
# it wipes fitloop.db first so don't point it at data you
# want to keep
# ------------------------------------------------------

from datetime import date, datetime, timedelta

from app import app, db
from seed_exercises import seed_exercises

with app.app_context():
    db.drop_all()
    db.create_all()
    seed_exercises()

client = app.test_client()


def call(method, path, **kwargs):
    response = getattr(client, method)(path, **kwargs)
    body = response.get_json(silent=True)
    return response.status_code, body


status, user = call("post", "/register", json={
    "username": "lifter", "email": "lifter@example.com", "password": "pw12345",
})
uid = user["id"]

# --- library ---------------------------------------------------------
status, library = call("get", f"/exercises?user_id={uid}")
print("library size:", len(library))
assert status == 200 and len(library) > 30

status, chest = call("get", f"/exercises?user_id={uid}&muscle=chest")
assert all(e["muscle_group"] == "chest" for e in chest)

status, custom = call("post", f"/users/{uid}/exercises", json={"name": "Sled Push", "muscle_group": "quads", "kind": "timed"})
assert status == 201
status, dupe = call("post", f"/users/{uid}/exercises", json={"name": "sled push"})
assert status == 400, "duplicate names should be refused"

by_name = {e["name"]: e["id"] for e in library}
bench, squat, plank = by_name["Barbell Bench Press"], by_name["Back Squat"], by_name["Plank"]

# --- routines and plan -----------------------------------------------
status, routine = call("post", f"/users/{uid}/routines", json={
    "name": "Push A",
    "items": [
        {"exercise_id": bench, "target_sets": 3, "rep_min": 5, "rep_max": 8, "progression": "double"},
        {"exercise_id": plank, "target_sets": 2},
    ],
})
assert status == 201 and len(routine["items"]) == 2
rid = routine["id"]

today = date.today()
weekly = [None] * 7
weekly[today.weekday()] = rid
status, plan = call("put", f"/users/{uid}/plan", json={"weekly": weekly})
assert plan["weekly"][today.weekday()] == rid

status, planned = call("get", f"/users/{uid}/today?date={today.isoformat()}")
assert planned["routine"]["id"] == rid
print("today's routine:", planned["routine"]["name"])

# --- first workout: no history, everything is a first time -------------
status, workout = call("post", f"/users/{uid}/workouts", json={"routine_id": rid})
assert status == 201 and len(workout["exercises"]) == 2
wid = workout["id"]
assert workout["exercises"][0]["suggestion"]["weight_kg"] is None

status, resumed = call("post", f"/users/{uid}/workouts", json={"routine_id": rid})
assert resumed["id"] == wid and resumed["resumed"], "second start should resume, not duplicate"

for reps in (8, 8, 8):
    status, s = call("post", f"/workouts/{wid}/sets", json={"exercise_id": bench, "weight_kg": 60, "reps": reps})
    assert status == 201
    assert s["records"] == [], "first ever session shouldn't announce records"

status, bad = call("post", f"/workouts/{wid}/sets", json={"exercise_id": bench, "weight_kg": 60})
assert status == 400, "a set with no reps should be refused"

status, summary = call("post", f"/workouts/{wid}/finish")
print("first summary:", summary["set_count"], "sets,", summary["volume_kg"], "kg")
assert summary["set_count"] == 3 and summary["volume_kg"] == 1440

# --- second workout: should suggest more weight, and catch a PR --------
status, workout2 = call("post", f"/users/{uid}/workouts", json={"routine_id": rid})
wid2 = workout2["id"]
suggestion = workout2["exercises"][0]["suggestion"]
print("suggestion after hitting the top of the range:", suggestion)
assert suggestion["weight_kg"] == 62.5 and suggestion["reps"] == 5

status, warm = call("post", f"/workouts/{wid2}/sets", json={"exercise_id": bench, "weight_kg": 100, "reps": 1, "set_type": "warmup"})
assert warm["records"] == [], "warm-ups must never count as records"

status, heavy = call("post", f"/workouts/{wid2}/sets", json={"exercise_id": bench, "weight_kg": 62.5, "reps": 5})
print("heavy set records:", heavy["records"])
assert "weight" in heavy["records"]

status, finished = call("post", f"/workouts/{wid2}/finish")
assert len(finished["prs"]) == 1

# deleting the PR set should clear the flag and not crash
status, _ = call("delete", f"/sets/{heavy['id']}")
assert status == 204

# --- progress and stats ----------------------------------------------
status, progress = call("get", f"/users/{uid}/exercises/{bench}/progress")
# The second session now only holds a warm-up (the heavy set was just
# deleted), and warm-ups don't count, so only the first session shows.
assert len(progress["history"]) == 1 and progress["bests"]["weight_kg"] == 60

status, stats = call("get", f"/users/{uid}/stats")
assert stats["workouts_this_week"] == 2
print("muscles this week:", stats["muscles_this_week"])

# --- rotation mode ---------------------------------------------------
status, other = call("post", f"/users/{uid}/routines", json={"name": "Legs", "items": [{"exercise_id": squat}]})
status, plan = call("put", f"/users/{uid}/plan", json={"mode": "rotation", "rotation": [rid, other["id"]]})
status, planned = call("get", f"/users/{uid}/today?date={today.isoformat()}")
print("rotation next up:", planned["routine"]["name"])
assert planned["routine"]["name"] == "Legs", "after Push A the rotation should offer Legs"

# --- coach: two missed planned days in a row should speak up ---------
weekly = [rid] * 7
call("put", f"/users/{uid}/plan", json={"mode": "weekly", "weekly": weekly})
with app.app_context():
    from training_models import Workout
    Workout.query.delete()
    db.session.commit()
status, coach = call("get", f"/users/{uid}/coach-check")
print("coach metrics:", [m["metric"] for m in coach["messages"]])
assert any(m["metric"] == "training" for m in coach["messages"])

# --- deleting a routine leaves history alone -------------------------
status, _ = call("delete", f"/routines/{rid}")
assert status == 204

print("\nAll training checks passed.")
