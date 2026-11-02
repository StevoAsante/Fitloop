# ------------------------------------------------------
# progression.py — Targets, 1RM and Personal Records
# ------------------------------------------------------
# The maths behind "what should I lift next time" and "was
# that a PR". Kept as plain functions with no database
# access so they're easy to test by hand, training.py does
# the querying and hands the numbers in. Every suggestion
# comes back with a reason string, a target that just says
# "62.5 kg" with no explanation feels arbitrary, and people
# trust a number more when they can see why it's that one
# ------------------------------------------------------

# Anything lighter than this isn't a working set. Used to ignore warm-ups
# even if someone forgot to tag them, a 20 kg bar set shouldn't make a
# 100 kg squatter look like they stalled.
DELOAD_FACTOR = 0.9

# How many sessions in a row without hitting the target before we call it
# a stall. Three felt right, two is too twitchy (one bad night's sleep
# can cause two misses), four lets someone grind for a month.
STALL_SESSIONS = 3


def estimate_one_rep_max(weight_kg, reps):
    """
    Epley formula. Rough on purpose, it gets less trustworthy past about
    10 reps, so the app only needs it for comparing sets against each
    other, not as a number to load a bar with.
    """
    if not weight_kg or not reps or reps < 1:
        return 0.0
    if reps == 1:
        return float(weight_kg)
    return weight_kg * (1 + reps / 30)


def round_to_plate(weight_kg, step=2.5):
    # Gym plates come in fixed jumps, so a suggestion of 61.37 kg is
    # useless. Round to the nearest step instead of making people do it.
    return round(round(weight_kg / step) * step, 2)


def _working_sets(session_sets):
    return [s for s in session_sets if s.get("set_type", "normal") != "warmup" and s.get("reps")]


def detect_prs(previous_best, weight_kg, reps, kind, duration_secs=None):
    """
    Works out which records a single new set breaks. `previous_best` is a
    dict of the user's best-ever numbers for this exercise before this
    set: {"weight": float, "e1rm": float, "reps": int, "seconds": int}.

    Returns a list of record names, empty if nothing was beaten. The
    very first time someone logs an exercise everything is "a record",
    which is technically true but not worth celebrating, so a missing
    previous best returns nothing.
    """
    if not previous_best:
        return []

    records = []

    if kind in ("strength", "bodyweight") and weight_kg and reps:
        if weight_kg > previous_best.get("weight", 0):
            records.append("weight")
        if estimate_one_rep_max(weight_kg, reps) > previous_best.get("e1rm", 0) + 0.01:
            records.append("e1rm")

    # Bodyweight reps only count as a "reps" record when nothing was
    # added, otherwise a weighted set would be compared with a bare one.
    if kind == "bodyweight" and reps and not weight_kg:
        if reps > previous_best.get("reps", 0):
            records.append("reps")

    # Timed holds (plank, dead hang) have one record that matters, how
    # long, so they get their own check instead of sharing the lifts one.
    if kind == "timed" and duration_secs:
        if duration_secs > previous_best.get("seconds", 0):
            records.append("time")

    return records


def suggest_next_target(history, rep_min, rep_max, progression, increment_kg=2.5):
    """
    `history` is a list of past sessions for this exercise, newest first.
    Each session is a list of set dicts with weight_kg, reps and set_type.

    Returns {"weight_kg", "reps", "reason"}. If there's no history at all
    the weight comes back as None and the reason says so, the app then
    leaves the field empty instead of inventing a starting weight.

    One rule holds across every mode: missed reps never add load.
    """
    sessions = [_working_sets(s) for s in history]
    sessions = [s for s in sessions if s]

    if not sessions:
        return {"weight_kg": None, "reps": rep_min, "reason": "First time, pick a weight you can control for the whole range."}

    last = sessions[0]
    # The top weight of the session is the one we're progressing, the
    # lighter back-off sets after it shouldn't drag the target down.
    last_weight = max(s.get("weight_kg") or 0 for s in last)
    at_weight = [s for s in last if (s.get("weight_kg") or 0) == last_weight]
    lowest_reps = min(s["reps"] for s in at_weight)

    if progression == "none":
        return {"weight_kg": last_weight, "reps": rep_min, "reason": "No progression rule on this exercise, repeating last time."}

    # Stall check runs before the rules below so a long plateau gets a
    # deload instead of yet another "try the same again".
    if len(sessions) >= STALL_SESSIONS and last_weight > 0:
        recent = sessions[:STALL_SESSIONS]
        same_weight = all(max(s.get("weight_kg") or 0 for s in sess) == last_weight for sess in recent)
        none_hit_target = all(min(s["reps"] for s in sess) < rep_max for sess in recent)
        if same_weight and none_hit_target:
            return {
                "weight_kg": round_to_plate(last_weight * DELOAD_FACTOR),
                "reps": rep_max,
                "reason": f"Stuck at {last_weight:g} kg for {STALL_SESSIONS} sessions, so a 10% deload to build back up.",
            }

    hit_top = lowest_reps >= rep_max and len(at_weight) >= 1

    if progression == "linear":
        if hit_top:
            return {
                "weight_kg": round_to_plate(last_weight + increment_kg),
                "reps": rep_max,
                "reason": f"Hit {rep_max} reps on every set last time, adding {increment_kg:g} kg.",
            }
        return {
            "weight_kg": last_weight,
            "reps": rep_max,
            "reason": f"Didn't hit {rep_max} on every set last time, so same weight again.",
        }

    # Double progression: climb the reps first, add weight only once the
    # top of the range is reached on every set, then drop back to the
    # bottom of the range at the new weight.
    if hit_top:
        return {
            "weight_kg": round_to_plate(last_weight + increment_kg),
            "reps": rep_min,
            "reason": f"Every set reached {rep_max} reps, so add {increment_kg:g} kg and start the range again.",
        }
    return {
        "weight_kg": last_weight,
        "reps": min(rep_max, lowest_reps + 1),
        "reason": f"Your lowest set was {lowest_reps} reps, aim for one more at the same weight.",
    }
