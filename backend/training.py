# ------------------------------------------------------
# training.py — Workout Tracking API
# ------------------------------------------------------
# Exercise library, routines, the weekly plan, guided
# workouts, sets, records and progress stats. It's a
# blueprint so app.py only needs one register line, and so
# the gym side doesn't bury the original account and
# daily-log routes
#
# Auth is the same placeholder as the rest of the API (the
# user id travels in the URL, nothing proves it's really
# them). Fine for local work, and the thing to fix first
# when real tokens arrive, every route here would pick it
# up through one shared check
# ------------------------------------------------------

from collections import defaultdict
from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from models import db
from progression import detect_prs, estimate_one_rep_max, suggest_next_target
from training_models import (
    Exercise,
    PlanSettings,
    PlanSlot,
    Routine,
    RoutineExercise,
    SetEntry,
    Workout,
    WorkoutExercise,
)

training = Blueprint("training", __name__)

VALID_KINDS = ("strength", "bodyweight", "timed", "cardio")
VALID_SET_TYPES = ("normal", "warmup", "drop")
VALID_PROGRESSIONS = ("none", "linear", "double")


# ------------------------------------------------------
# Small helpers
# ------------------------------------------------------

class BadRequest(Exception):
    pass


@training.errorhandler(BadRequest)
def handle_bad_request(err):
    # Same {"error": ...} shape the mobile api.ts already knows how
    # to read, so every validation failure shows up as a normal message.
    return jsonify({"error": str(err)}), 400


def _number(data, key, low, high, as_int=False):
    # Pulls an optional number out of a request body and range-checks
    # it. None (or missing) is fine, the caller decides if it's needed.
    value = data.get(key)
    if value is None or value == "":
        return None
    try:
        value = int(value) if as_int else float(value)
    except (TypeError, ValueError):
        raise BadRequest(f"{key} must be a number")
    if value < low or value > high:
        raise BadRequest(f"{key} must be between {low} and {high}")
    return value


def _iso(moment):
    # Stored as naive UTC. The trailing Z tells JavaScript's Date it's
    # UTC, without it the phone would read it as local time and every
    # workout would land hours off.
    return moment.isoformat() + "Z" if moment else None


def _parse_moment(raw):
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        raise BadRequest("dates must be ISO 8601")
    # Back to naive UTC for storage.
    if parsed.tzinfo is not None:
        parsed = (parsed - parsed.utcoffset()).replace(tzinfo=None)
    return parsed


def _visible_exercises(user_id):
    return Exercise.query.filter(or_(Exercise.created_by.is_(None), Exercise.created_by == user_id))


def serialize_exercise(exercise):
    return {
        "id": exercise.id,
        "name": exercise.name,
        "muscle_group": exercise.muscle_group,
        "equipment": exercise.equipment,
        "kind": exercise.kind,
        "instructions": exercise.instructions,
        "is_custom": exercise.created_by is not None,
    }


def serialize_set(entry):
    return {
        "id": entry.id,
        "exercise_id": entry.exercise_id,
        "set_number": entry.set_number,
        "weight_kg": entry.weight_kg,
        "reps": entry.reps,
        "duration_secs": entry.duration_secs,
        "distance_km": entry.distance_km,
        "effort": entry.effort,
        "set_type": entry.set_type,
        "is_pr": entry.is_pr,
    }


def serialize_routine(routine):
    return {
        "id": routine.id,
        "name": routine.name,
        "notes": routine.notes,
        "items": [
            {
                "exercise": serialize_exercise(item.exercise),
                "target_sets": item.target_sets,
                "rep_min": item.rep_min,
                "rep_max": item.rep_max,
                "rest_seconds": item.rest_seconds,
                "progression": item.progression,
                "increment_kg": item.increment_kg,
                "superset_group": item.superset_group,
            }
            for item in routine.items
        ],
    }


def _read_item_fields(raw):
    # Shared by routines and ad-hoc workout exercises, both take the
    # same targets, so one parser keeps the limits identical.
    rep_min = _number(raw, "rep_min", 1, 100, as_int=True) or 8
    rep_max = _number(raw, "rep_max", 1, 100, as_int=True) or max(rep_min, 12)
    if rep_max < rep_min:
        raise BadRequest("rep_max can't be lower than rep_min")
    progression = raw.get("progression", "double")
    if progression not in VALID_PROGRESSIONS:
        raise BadRequest("progression must be none, linear or double")
    return {
        "target_sets": _number(raw, "target_sets", 1, 20, as_int=True) or 3,
        "rep_min": rep_min,
        "rep_max": rep_max,
        "rest_seconds": _number(raw, "rest_seconds", 0, 900, as_int=True) or 90,
        "progression": progression,
        "increment_kg": _number(raw, "increment_kg", 0, 50) or 2.5,
        "superset_group": _number(raw, "superset_group", 1, 99, as_int=True),
    }


# ------------------------------------------------------
# Exercise library
# ------------------------------------------------------

@training.route("/exercises", methods=["GET"])
def list_exercises():
    """
    Shared library plus the caller's own custom exercises. Filtering
    happens server-side so the phone isn't sorting hundreds of rows
    once the library grows, even though the seed set is small today.
    """
    user_id = request.args.get("user_id", type=int)
    query = _visible_exercises(user_id)

    search = request.args.get("q", "").strip()
    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))
    muscle = request.args.get("muscle")
    if muscle:
        query = query.filter(Exercise.muscle_group == muscle)
    equipment = request.args.get("equipment")
    if equipment:
        query = query.filter(Exercise.equipment == equipment)

    exercises = query.order_by(Exercise.muscle_group, Exercise.name).all()
    return jsonify([serialize_exercise(e) for e in exercises])


@training.route("/users/<int:user_id>/exercises", methods=["POST"])
def create_exercise(user_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise BadRequest("name is required")
    kind = data.get("kind", "strength")
    if kind not in VALID_KINDS:
        raise BadRequest("kind must be strength, bodyweight, timed or cardio")

    # Two exercises with the same name would be impossible to tell apart
    # in a picker, so block duplicates against anything this user can see.
    if _visible_exercises(user_id).filter(Exercise.name.ilike(name)).first():
        raise BadRequest("An exercise with that name already exists")

    exercise = Exercise(
        name=name,
        muscle_group=(data.get("muscle_group") or "other").strip().lower(),
        equipment=(data.get("equipment") or "other").strip().lower(),
        kind=kind,
        instructions=data.get("instructions"),
        created_by=user_id,
    )
    db.session.add(exercise)
    db.session.commit()
    return jsonify(serialize_exercise(exercise)), 201


@training.route("/users/<int:user_id>/exercises/<int:exercise_id>", methods=["DELETE"])
def delete_exercise(user_id, exercise_id):
    exercise = Exercise.query.get_or_404(exercise_id)
    # Shared exercises can't be deleted, and neither can another
    # person's custom one.
    if exercise.created_by != user_id:
        return jsonify({"error": "You can only delete your own exercises"}), 403
    # Logged history points at this row, deleting it would orphan every
    # set that used it. Stopping here is kinder than silently losing data.
    if SetEntry.query.filter_by(exercise_id=exercise_id).first():
        return jsonify({"error": "This exercise has logged sets, so it can't be deleted"}), 409
    RoutineExercise.query.filter_by(exercise_id=exercise_id).delete()
    db.session.delete(exercise)
    db.session.commit()
    return "", 204


# ------------------------------------------------------
# Routines
# ------------------------------------------------------

def _replace_routine_items(routine, raw_items):
    if not isinstance(raw_items, list):
        raise BadRequest("items must be a list")
    routine.items.clear()
    for position, raw in enumerate(raw_items):
        exercise = db.session.get(Exercise, raw.get("exercise_id"))
        if exercise is None:
            raise BadRequest("Unknown exercise in routine")
        routine.items.append(
            RoutineExercise(exercise_id=exercise.id, position=position, **_read_item_fields(raw))
        )


@training.route("/users/<int:user_id>/routines", methods=["GET"])
def list_routines(user_id):
    routines = Routine.query.filter_by(user_id=user_id).order_by(Routine.name).all()
    return jsonify([serialize_routine(r) for r in routines])


@training.route("/users/<int:user_id>/routines", methods=["POST"])
def create_routine(user_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        raise BadRequest("name is required")

    routine = Routine(user_id=user_id, name=name, notes=data.get("notes"))
    _replace_routine_items(routine, data.get("items", []))
    db.session.add(routine)
    db.session.commit()
    return jsonify(serialize_routine(routine)), 201


@training.route("/routines/<int:routine_id>", methods=["GET"])
def get_routine(routine_id):
    return jsonify(serialize_routine(Routine.query.get_or_404(routine_id)))


@training.route("/routines/<int:routine_id>", methods=["PUT"])
def update_routine(routine_id):
    routine = Routine.query.get_or_404(routine_id)
    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise BadRequest("name can't be empty")
        routine.name = name
    if "notes" in data:
        routine.notes = data["notes"]
    if "items" in data:
        _replace_routine_items(routine, data["items"])

    db.session.commit()
    return jsonify(serialize_routine(routine))


@training.route("/routines/<int:routine_id>", methods=["DELETE"])
def delete_routine(routine_id):
    routine = Routine.query.get_or_404(routine_id)
    # Past workouts keep their own copy of the exercise list, so they
    # survive this. They just lose the link back to the routine.
    Workout.query.filter_by(routine_id=routine_id).update({"routine_id": None})
    PlanSlot.query.filter_by(routine_id=routine_id).delete()
    db.session.delete(routine)
    db.session.commit()
    return "", 204


# ------------------------------------------------------
# Weekly plan and rotation
# ------------------------------------------------------

def _plan_mode(user_id):
    settings = db.session.get(PlanSettings, user_id)
    return settings.mode if settings else "weekly"


def _serialize_plan(user_id):
    slots = PlanSlot.query.filter_by(user_id=user_id).all()
    weekly = [None] * 7
    rotation = []
    for slot in sorted((s for s in slots if s.mode == "rotation"), key=lambda s: s.slot_index):
        rotation.append(slot.routine_id)
    for slot in slots:
        if slot.mode == "weekly" and 0 <= slot.slot_index < 7:
            weekly[slot.slot_index] = slot.routine_id
    return {"mode": _plan_mode(user_id), "weekly": weekly, "rotation": rotation}


@training.route("/users/<int:user_id>/plan", methods=["GET"])
def get_plan(user_id):
    return jsonify(_serialize_plan(user_id))


@training.route("/users/<int:user_id>/plan", methods=["PUT"])
def update_plan(user_id):
    """
    Accepts any of mode, weekly (7 routine ids or nulls, Monday first)
    and rotation (an ordered list of routine ids). Only what's sent
    changes, the settings screen saves one thing at a time.
    """
    data = request.get_json(silent=True) or {}

    def check_routine(routine_id):
        routine = db.session.get(Routine, routine_id)
        if routine is None or routine.user_id != user_id:
            raise BadRequest("Unknown routine in plan")

    if "mode" in data:
        if data["mode"] not in ("weekly", "rotation"):
            raise BadRequest("mode must be weekly or rotation")
        settings = db.session.get(PlanSettings, user_id) or PlanSettings(user_id=user_id)
        settings.mode = data["mode"]
        db.session.add(settings)

    if "weekly" in data:
        weekly = data["weekly"]
        if not isinstance(weekly, list) or len(weekly) != 7:
            raise BadRequest("weekly must be a list of 7 entries, Monday first")
        PlanSlot.query.filter_by(user_id=user_id, mode="weekly").delete()
        for index, routine_id in enumerate(weekly):
            if routine_id is not None:
                check_routine(routine_id)
                db.session.add(PlanSlot(user_id=user_id, mode="weekly", slot_index=index, routine_id=routine_id))

    if "rotation" in data:
        rotation = data["rotation"]
        if not isinstance(rotation, list):
            raise BadRequest("rotation must be a list")
        PlanSlot.query.filter_by(user_id=user_id, mode="rotation").delete()
        for index, routine_id in enumerate(rotation):
            check_routine(routine_id)
            db.session.add(PlanSlot(user_id=user_id, mode="rotation", slot_index=index, routine_id=routine_id))

    db.session.commit()
    return jsonify(_serialize_plan(user_id))


def _active_workout(user_id):
    return (
        Workout.query.filter_by(user_id=user_id, finished_at=None)
        .order_by(Workout.started_at.desc())
        .first()
    )


def _routine_for_day(user_id, day):
    """
    Which routine is planned for `day`. Weekly mode is a plain lookup by
    weekday. Rotation mode ignores the calendar: the next session is
    whichever routine comes after the last one actually finished, so a
    missed week doesn't leave someone stuck on a day they skipped.
    """
    mode = _plan_mode(user_id)

    if mode == "weekly":
        slot = PlanSlot.query.filter_by(user_id=user_id, mode="weekly", slot_index=day.weekday()).first()
        return db.session.get(Routine, slot.routine_id) if slot else None

    slots = PlanSlot.query.filter_by(user_id=user_id, mode="rotation").order_by(PlanSlot.slot_index).all()
    if not slots:
        return None

    order = [s.routine_id for s in slots]
    last = (
        Workout.query.filter(
            Workout.user_id == user_id,
            Workout.finished_at.isnot(None),
            Workout.routine_id.in_(order),
        )
        .order_by(Workout.started_at.desc())
        .first()
    )
    next_index = 0 if last is None else (order.index(last.routine_id) + 1) % len(order)
    return db.session.get(Routine, order[next_index])


@training.route("/users/<int:user_id>/today", methods=["GET"])
def get_today(user_id):
    # The client sends its own local date. Working out "today" on the
    # server would use the server's clock and timezone, which for
    # anyone not sitting next to it means Monday's session turning up
    # on Sunday night.
    raw_date = request.args.get("date")
    try:
        day = datetime.strptime(raw_date, "%Y-%m-%d").date() if raw_date else date.today()
    except ValueError:
        raise BadRequest("date must be YYYY-MM-DD")

    routine = _routine_for_day(user_id, day)
    active = _active_workout(user_id)

    return jsonify({
        "mode": _plan_mode(user_id),
        "routine": serialize_routine(routine) if routine else None,
        "active_workout_id": active.id if active else None,
    })


# ------------------------------------------------------
# Records
# ------------------------------------------------------

def _is_working_set(entry):
    return entry.set_type != "warmup"


def _update_best(best, entry, kind):
    # Folds one set into the running bests. Called in date order, so by
    # the time a set is checked `best` only knows about earlier ones.
    if not _is_working_set(entry):
        return
    if entry.weight_kg and entry.reps:
        best["weight"] = max(best.get("weight", 0), entry.weight_kg)
        best["e1rm"] = max(best.get("e1rm", 0), estimate_one_rep_max(entry.weight_kg, entry.reps))
    if entry.reps and not entry.weight_kg:
        best["reps"] = max(best.get("reps", 0), entry.reps)
    if entry.duration_secs:
        best["seconds"] = max(best.get("seconds", 0), entry.duration_secs)


def _exercise_sets_in_order(user_id, exercise_id):
    return (
        SetEntry.query.join(Workout, SetEntry.workout_id == Workout.id)
        .filter(Workout.user_id == user_id, SetEntry.exercise_id == exercise_id)
        .order_by(Workout.started_at, SetEntry.id)
        .all()
    )


def recompute_prs(user_id, exercise_id):
    """
    Replays every set of one exercise from oldest to newest and flags
    the ones that beat everything before them. Done as a full replay
    instead of patching one flag because editing or deleting an old set
    can change which later sets count as records. The cost is a few
    hundred rows at most per exercise, which is nothing.

    Returns {set_id: [record names]} so the caller can report the new
    set's records straight back to the app.
    """
    exercise = db.session.get(Exercise, exercise_id)
    best = {}
    found = {}

    for entry in _exercise_sets_in_order(user_id, exercise_id):
        records = []
        if _is_working_set(entry):
            records = detect_prs(best, entry.weight_kg, entry.reps, exercise.kind, entry.duration_secs)
        entry.is_pr = bool(records)
        found[entry.id] = records
        _update_best(best, entry, exercise.kind)

    return found


def _best_for_exercise(user_id, exercise_id):
    exercise = db.session.get(Exercise, exercise_id)
    best = {}
    for entry in _exercise_sets_in_order(user_id, exercise_id):
        _update_best(best, entry, exercise.kind)
    return best


# ------------------------------------------------------
# Workouts
# ------------------------------------------------------

def _past_sessions(user_id, exercise_id, exclude_workout_id=None, limit=4):
    """
    The user's last few finished sessions for an exercise, newest first,
    each as a list of set dicts. Feeds both the "last time" hint on the
    workout screen and the progression suggestion.
    """
    query = (
        Workout.query.join(SetEntry, SetEntry.workout_id == Workout.id)
        .filter(
            Workout.user_id == user_id,
            Workout.finished_at.isnot(None),
            SetEntry.exercise_id == exercise_id,
        )
        .order_by(Workout.started_at.desc())
    )
    if exclude_workout_id:
        query = query.filter(Workout.id != exclude_workout_id)

    sessions = []
    for workout in query.distinct().limit(limit).all():
        entries = [s for s in workout.sets if s.exercise_id == exercise_id]
        sessions.append([serialize_set(e) for e in entries])
    return sessions


def serialize_workout(workout):
    exercises = []
    for item in workout.plan:
        history = _past_sessions(workout.user_id, item.exercise_id, exclude_workout_id=workout.id)
        suggestion = None
        if item.exercise.kind in ("strength", "bodyweight"):
            suggestion = suggest_next_target(
                history, item.rep_min, item.rep_max, item.progression, item.increment_kg
            )
        exercises.append({
            "id": item.id,
            "exercise": serialize_exercise(item.exercise),
            "target_sets": item.target_sets,
            "rep_min": item.rep_min,
            "rep_max": item.rep_max,
            "rest_seconds": item.rest_seconds,
            "progression": item.progression,
            "superset_group": item.superset_group,
            "last_sets": history[0] if history else [],
            "suggestion": suggestion,
            "sets": [serialize_set(s) for s in workout.sets if s.exercise_id == item.exercise_id],
        })

    return {
        "id": workout.id,
        "name": workout.name,
        "routine_id": workout.routine_id,
        "started_at": _iso(workout.started_at),
        "finished_at": _iso(workout.finished_at),
        "notes": workout.notes,
        "exercises": exercises,
    }


def _workout_summary(workout):
    working = [s for s in workout.sets if _is_working_set(s)]
    volume = sum((s.weight_kg or 0) * (s.reps or 0) for s in working)
    seconds = None
    if workout.finished_at:
        seconds = int((workout.finished_at - workout.started_at).total_seconds())
    return {
        "id": workout.id,
        "name": workout.name,
        "started_at": _iso(workout.started_at),
        "finished_at": _iso(workout.finished_at),
        "duration_secs": seconds,
        "set_count": len(working),
        "volume_kg": round(volume, 1),
        "pr_count": sum(1 for s in workout.sets if s.is_pr),
    }


@training.route("/users/<int:user_id>/workouts", methods=["POST"])
def start_workout(user_id):
    data = request.get_json(silent=True) or {}

    # Only one unfinished workout at a time. If one's already open,
    # hand it back rather than stacking a second, which is what happens
    # when someone double-taps Start or opens the app on a second device.
    existing = _active_workout(user_id)
    if existing is not None:
        payload = serialize_workout(existing)
        payload["resumed"] = True
        return jsonify(payload), 200

    routine = None
    if data.get("routine_id"):
        routine = db.session.get(Routine, data["routine_id"])
        if routine is None or routine.user_id != user_id:
            raise BadRequest("Unknown routine")

    name = (data.get("name") or (routine.name if routine else "Workout")).strip()
    workout = Workout(
        user_id=user_id,
        routine_id=routine.id if routine else None,
        name=name,
        started_at=_parse_moment(data.get("started_at")) or datetime.utcnow(),
    )
    if routine:
        for position, item in enumerate(routine.items):
            workout.plan.append(
                WorkoutExercise(
                    exercise_id=item.exercise_id,
                    position=position,
                    target_sets=item.target_sets,
                    rep_min=item.rep_min,
                    rep_max=item.rep_max,
                    rest_seconds=item.rest_seconds,
                    progression=item.progression,
                    increment_kg=item.increment_kg,
                    superset_group=item.superset_group,
                )
            )

    db.session.add(workout)
    db.session.commit()
    return jsonify(serialize_workout(workout)), 201


@training.route("/users/<int:user_id>/workouts", methods=["GET"])
def list_workouts(user_id):
    limit = min(request.args.get("limit", default=20, type=int), 100)
    offset = request.args.get("offset", default=0, type=int)
    workouts = (
        Workout.query.filter(Workout.user_id == user_id, Workout.finished_at.isnot(None))
        .order_by(Workout.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return jsonify([_workout_summary(w) for w in workouts])


@training.route("/workouts/<int:workout_id>", methods=["GET"])
def get_workout(workout_id):
    return jsonify(serialize_workout(Workout.query.get_or_404(workout_id)))


@training.route("/workouts/<int:workout_id>", methods=["PATCH"])
def update_workout(workout_id):
    # Covers fixing a name, adding notes, or moving a session to the
    # right date after logging it late, which is why started_at is
    # editable on a finished workout. Records get replayed afterwards
    # since changing the date can change which set came first.
    workout = Workout.query.get_or_404(workout_id)
    data = request.get_json(silent=True) or {}

    if "name" in data:
        workout.name = (data["name"] or "").strip() or workout.name
    if "notes" in data:
        workout.notes = data["notes"]
    if "started_at" in data:
        new_start = _parse_moment(data["started_at"])
        if workout.finished_at and workout.finished_at >= workout.started_at:
            # Keep the same duration so moving the date doesn't
            # accidentally turn a 50 minute session into a 3 day one.
            workout.finished_at = new_start + (workout.finished_at - workout.started_at)
        workout.started_at = new_start

    if "started_at" in data:
        for exercise_id in {s.exercise_id for s in workout.sets}:
            recompute_prs(workout.user_id, exercise_id)

    db.session.commit()
    return jsonify(serialize_workout(workout))


@training.route("/workouts/<int:workout_id>/finish", methods=["POST"])
def finish_workout(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    data = request.get_json(silent=True) or {}

    if workout.finished_at is None:
        workout.finished_at = datetime.utcnow()
    if "notes" in data:
        workout.notes = data["notes"]
    db.session.commit()

    summary = _workout_summary(workout)
    summary["prs"] = [
        {"exercise": s.exercise.name, "weight_kg": s.weight_kg, "reps": s.reps, "duration_secs": s.duration_secs}
        for s in workout.sets
        if s.is_pr
    ]
    return jsonify(summary)


@training.route("/workouts/<int:workout_id>", methods=["DELETE"])
def delete_workout(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    user_id = workout.user_id
    touched = {s.exercise_id for s in workout.sets}
    db.session.delete(workout)
    db.session.flush()
    for exercise_id in touched:
        recompute_prs(user_id, exercise_id)
    db.session.commit()
    return "", 204


@training.route("/workouts/<int:workout_id>/exercises", methods=["POST"])
def add_workout_exercise(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    data = request.get_json(silent=True) or {}

    exercise = db.session.get(Exercise, data.get("exercise_id"))
    if exercise is None:
        raise BadRequest("Unknown exercise")

    item = WorkoutExercise(
        exercise_id=exercise.id,
        position=len(workout.plan),
        **_read_item_fields(data),
    )
    workout.plan.append(item)
    db.session.commit()
    return jsonify(serialize_workout(workout)), 201


@training.route("/workouts/<int:workout_id>/exercises/<int:item_id>", methods=["DELETE"])
def remove_workout_exercise(workout_id, item_id):
    workout = Workout.query.get_or_404(workout_id)
    item = WorkoutExercise.query.filter_by(id=item_id, workout_id=workout_id).first_or_404()

    # Dropping an exercise takes its logged sets with it, otherwise
    # they'd stay in history attached to nothing visible.
    SetEntry.query.filter_by(workout_id=workout_id, exercise_id=item.exercise_id).delete()
    workout.plan.remove(item)
    db.session.flush()
    for position, remaining in enumerate(workout.plan):
        remaining.position = position
    recompute_prs(workout.user_id, item.exercise_id)
    db.session.commit()
    return jsonify(serialize_workout(workout))


# ------------------------------------------------------
# Sets
# ------------------------------------------------------

def _read_set_fields(data):
    set_type = data.get("set_type", "normal")
    if set_type not in VALID_SET_TYPES:
        raise BadRequest("set_type must be normal, warmup or drop")
    return {
        "weight_kg": _number(data, "weight_kg", 0, 1000),
        "reps": _number(data, "reps", 0, 1000, as_int=True),
        "duration_secs": _number(data, "duration_secs", 0, 86400, as_int=True),
        "distance_km": _number(data, "distance_km", 0, 1000),
        "effort": _number(data, "effort", 1, 10),
        "set_type": set_type,
    }


@training.route("/workouts/<int:workout_id>/sets", methods=["POST"])
def log_set(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    data = request.get_json(silent=True) or {}

    exercise = db.session.get(Exercise, data.get("exercise_id"))
    if exercise is None:
        raise BadRequest("Unknown exercise")

    fields = _read_set_fields(data)
    if not any([fields["reps"], fields["duration_secs"], fields["distance_km"]]):
        raise BadRequest("A set needs reps, a duration or a distance")

    # Logging a set for an exercise that isn't in the workout yet adds
    # it. Saves the app a separate call when someone picks something
    # from the library mid-session.
    if not any(item.exercise_id == exercise.id for item in workout.plan):
        workout.plan.append(WorkoutExercise(exercise_id=exercise.id, position=len(workout.plan)))

    already = sum(1 for s in workout.sets if s.exercise_id == exercise.id)
    entry = SetEntry(workout_id=workout.id, exercise_id=exercise.id, set_number=already + 1, **fields)
    workout.sets.append(entry)
    db.session.flush()

    found = recompute_prs(workout.user_id, exercise.id)
    db.session.commit()

    payload = serialize_set(entry)
    payload["records"] = found.get(entry.id, [])
    return jsonify(payload), 201


@training.route("/sets/<int:set_id>", methods=["PATCH"])
def update_set(set_id):
    entry = SetEntry.query.get_or_404(set_id)
    data = request.get_json(silent=True) or {}

    # Merge over the existing values first so a PATCH carrying only
    # "reps" doesn't wipe the weight.
    merged = {
        "weight_kg": entry.weight_kg,
        "reps": entry.reps,
        "duration_secs": entry.duration_secs,
        "distance_km": entry.distance_km,
        "effort": entry.effort,
        "set_type": entry.set_type,
    }
    merged.update({k: v for k, v in data.items() if k in merged})
    fields = _read_set_fields(merged)
    for key, value in fields.items():
        setattr(entry, key, value)

    db.session.flush()
    found = recompute_prs(entry.workout.user_id, entry.exercise_id)
    db.session.commit()

    payload = serialize_set(entry)
    payload["records"] = found.get(entry.id, [])
    return jsonify(payload)


@training.route("/sets/<int:set_id>", methods=["DELETE"])
def delete_set(set_id):
    entry = SetEntry.query.get_or_404(set_id)
    user_id = entry.workout.user_id
    workout_id = entry.workout_id
    exercise_id = entry.exercise_id

    db.session.delete(entry)
    db.session.flush()

    # Renumber what's left so deleting set 2 of 4 doesn't leave a gap.
    remaining = (
        SetEntry.query.filter_by(workout_id=workout_id, exercise_id=exercise_id)
        .order_by(SetEntry.id)
        .all()
    )
    for number, other in enumerate(remaining, start=1):
        other.set_number = number

    recompute_prs(user_id, exercise_id)
    db.session.commit()
    return "", 204


# ------------------------------------------------------
# Progress and stats
# ------------------------------------------------------

@training.route("/users/<int:user_id>/exercises/<int:exercise_id>/progress", methods=["GET"])
def exercise_progress(user_id, exercise_id):
    exercise = Exercise.query.get_or_404(exercise_id)

    per_workout = defaultdict(list)
    for entry in _exercise_sets_in_order(user_id, exercise_id):
        if _is_working_set(entry):
            per_workout[entry.workout_id].append(entry)

    history = []
    for workout_id, entries in per_workout.items():
        workout = db.session.get(Workout, workout_id)
        if workout.finished_at is None:
            continue
        history.append({
            "workout_id": workout_id,
            "date": _iso(workout.started_at),
            "top_weight_kg": max((e.weight_kg or 0) for e in entries),
            "best_e1rm": round(max(estimate_one_rep_max(e.weight_kg, e.reps) for e in entries), 1),
            "volume_kg": round(sum((e.weight_kg or 0) * (e.reps or 0) for e in entries), 1),
            "best_seconds": max((e.duration_secs or 0) for e in entries),
        })
    history.sort(key=lambda row: row["date"])

    best = _best_for_exercise(user_id, exercise_id)
    return jsonify({
        "exercise": serialize_exercise(exercise),
        "history": history,
        "bests": {
            "weight_kg": best.get("weight", 0),
            "e1rm": round(best.get("e1rm", 0), 1),
            "reps": best.get("reps", 0),
            "seconds": best.get("seconds", 0),
        },
    })


@training.route("/users/<int:user_id>/stats", methods=["GET"])
def training_stats(user_id):
    """
    One call for the whole progress screen: a heatmap of sessions per
    day, this week's volume per muscle group, and the latest records.
    Bundled so the screen makes one request instead of three, it's the
    heaviest tab and the one most likely to be opened on bad signal.
    """
    days = min(request.args.get("days", default=84, type=int), 365)
    since = datetime.utcnow() - timedelta(days=days)
    week_ago = datetime.utcnow() - timedelta(days=7)

    workouts = (
        Workout.query.filter(
            Workout.user_id == user_id,
            Workout.finished_at.isnot(None),
            Workout.started_at >= since,
        )
        .order_by(Workout.started_at)
        .all()
    )

    heatmap = defaultdict(int)
    muscle_volume = defaultdict(float)
    muscle_sets = defaultdict(int)
    week_count = 0

    for workout in workouts:
        heatmap[workout.started_at.date().isoformat()] += 1
        if workout.started_at >= week_ago:
            week_count += 1
            for entry in workout.sets:
                if not _is_working_set(entry):
                    continue
                muscle = entry.exercise.muscle_group
                muscle_sets[muscle] += 1
                muscle_volume[muscle] += (entry.weight_kg or 0) * (entry.reps or 0)

    recent_prs = (
        SetEntry.query.join(Workout, SetEntry.workout_id == Workout.id)
        .filter(Workout.user_id == user_id, SetEntry.is_pr.is_(True), Workout.finished_at.isnot(None))
        .order_by(Workout.started_at.desc(), SetEntry.id.desc())
        .limit(10)
        .all()
    )

    return jsonify({
        "heatmap": heatmap,
        "workouts_this_week": week_count,
        "muscles_this_week": [
            {"muscle": m, "sets": muscle_sets[m], "volume_kg": round(muscle_volume[m], 1)}
            for m in sorted(muscle_sets, key=lambda k: -muscle_sets[k])
        ],
        "recent_prs": [
            {
                "exercise": s.exercise.name,
                "exercise_id": s.exercise_id,
                "weight_kg": s.weight_kg,
                "reps": s.reps,
                "duration_secs": s.duration_secs,
                "date": _iso(s.workout.started_at),
            }
            for s in recent_prs
        ],
    })


# ------------------------------------------------------
# Coach hook
# ------------------------------------------------------

def count_missed_planned_sessions(user_id, today, lookback=7):
    """
    How many planned sessions in a row (most recent first) were skipped.
    Used by the coach check in app.py. Rest days are ignored rather
    than counted, someone who trained Monday, rested Tuesday and
    Wednesday and then missed Thursday has missed one session, not three.

    Only meaningful in weekly mode. A rotation has no "missed day", the
    next session just waits, so it returns 0 and the coach stays quiet.
    """
    if _plan_mode(user_id) != "weekly":
        return 0

    missed = 0
    for offset in range(1, lookback + 1):
        day = today - timedelta(days=offset)
        planned = PlanSlot.query.filter_by(user_id=user_id, mode="weekly", slot_index=day.weekday()).first()
        if planned is None:
            continue

        start = datetime.combine(day, datetime.min.time())
        end = start + timedelta(days=1)
        trained = Workout.query.filter(
            Workout.user_id == user_id,
            Workout.finished_at.isnot(None),
            Workout.started_at >= start,
            Workout.started_at < end,
        ).first()
        if trained:
            break
        missed += 1

    return missed
