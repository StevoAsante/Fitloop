# ------------------------------------------------------
# seed_exercises.py — Starter Exercise Library
# ------------------------------------------------------
# A hand-written starter set so the library isn't empty on
# first run. Nowhere near exhaustive, the point is covering
# every muscle group and every logging kind (strength,
# bodyweight, timed, cardio) so each screen has something to
# show. Safe to run on every start up, it only inserts when
# the table is empty, so it never duplicates or overwrites
# anything a user has added
# ------------------------------------------------------

from models import db
from training_models import Exercise

# name, muscle group, equipment, kind, one-line cue
_SEED = [
    # Chest
    ("Barbell Bench Press", "chest", "barbell", "strength", "Shoulder blades pinched, bar to lower chest, press up and slightly back."),
    ("Incline Dumbbell Press", "chest", "dumbbell", "strength", "Bench at 30 degrees, press the dumbbells up and together."),
    ("Push-up", "chest", "bodyweight", "bodyweight", "Body in one line, chest to the floor, elbows about 45 degrees from the torso."),
    ("Cable Fly", "chest", "cable", "strength", "Soft elbows, hug a barrel, squeeze at the middle."),
    ("Dip", "chest", "bodyweight", "bodyweight", "Lean forward a little, lower until shoulders are below the elbows."),
    # Back
    ("Deadlift", "back", "barbell", "strength", "Bar over mid-foot, flat back, push the floor away."),
    ("Barbell Row", "back", "barbell", "strength", "Hinge at the hips, pull the bar to your belly button."),
    ("Pull-up", "back", "bodyweight", "bodyweight", "Start from a dead hang, chin over the bar, lower under control."),
    ("Lat Pulldown", "back", "cable", "strength", "Pull the bar to your upper chest, elbows going down not back."),
    ("Seated Cable Row", "back", "cable", "strength", "Sit tall, pull to the stomach, pause with shoulder blades together."),
    ("One-arm Dumbbell Row", "back", "dumbbell", "strength", "Hand and knee on a bench, pull the dumbbell to your hip."),
    # Shoulders
    ("Overhead Press", "shoulders", "barbell", "strength", "Squeeze the glutes, press straight up, head through at the top."),
    ("Dumbbell Lateral Raise", "shoulders", "dumbbell", "strength", "Lead with the elbows, stop at shoulder height."),
    ("Face Pull", "shoulders", "cable", "strength", "Rope to the forehead, elbows high, pull the ends apart."),
    ("Dumbbell Shoulder Press", "shoulders", "dumbbell", "strength", "Press from ear height until the arms are straight."),
    # Arms
    ("Barbell Curl", "biceps", "barbell", "strength", "Elbows pinned to your sides, no swinging."),
    ("Hammer Curl", "biceps", "dumbbell", "strength", "Palms facing each other the whole way up."),
    ("Chin-up", "biceps", "bodyweight", "bodyweight", "Underhand grip, pull until the chin clears the bar."),
    ("Triceps Pushdown", "triceps", "cable", "strength", "Elbows stay put, straighten fully at the bottom."),
    ("Skull Crusher", "triceps", "barbell", "strength", "Lower the bar towards the forehead, extend without flaring the elbows."),
    ("Close-grip Bench Press", "triceps", "barbell", "strength", "Hands about shoulder width, elbows tucked."),
    # Legs
    ("Back Squat", "quads", "barbell", "strength", "Bar on the upper back, sit between the hips, drive up through mid-foot."),
    ("Front Squat", "quads", "barbell", "strength", "Elbows high, bar on the front delts, stay upright."),
    ("Leg Press", "quads", "machine", "strength", "Feet shoulder width, lower until the knees are about 90 degrees."),
    ("Leg Extension", "quads", "machine", "strength", "Squeeze at the top for a second, lower slowly."),
    ("Walking Lunge", "quads", "dumbbell", "strength", "Long step, back knee near the floor, push through the front heel."),
    ("Bulgarian Split Squat", "quads", "dumbbell", "strength", "Back foot on a bench, most of the weight on the front leg."),
    ("Romanian Deadlift", "hamstrings", "barbell", "strength", "Soft knees, push the hips back, bar stays close to the legs."),
    ("Lying Leg Curl", "hamstrings", "machine", "strength", "Curl the heels to the glutes, control the way down."),
    ("Hip Thrust", "glutes", "barbell", "strength", "Upper back on a bench, drive the hips up, pause at the top."),
    ("Glute Bridge", "glutes", "bodyweight", "bodyweight", "Heels close to the glutes, lift until hips and shoulders line up."),
    ("Standing Calf Raise", "calves", "machine", "strength", "Full stretch at the bottom, pause at the top."),
    # Core
    ("Plank", "core", "bodyweight", "timed", "Forearms down, body straight, squeeze glutes and abs."),
    ("Side Plank", "core", "bodyweight", "timed", "Stack the feet, lift the hips, keep the line straight."),
    ("Hanging Leg Raise", "core", "bodyweight", "bodyweight", "Dead hang, lift the legs without swinging."),
    ("Cable Crunch", "core", "cable", "strength", "Curl the ribs to the hips, don't just bow from the hips."),
    ("Ab Wheel Rollout", "core", "other", "bodyweight", "Roll out as far as you can keep the lower back flat."),
    ("Farmer's Carry", "core", "dumbbell", "timed", "Tall posture, short quick steps, don't lean."),
    ("Dead Hang", "back", "bodyweight", "timed", "Relaxed shoulders, grip as long as you can."),
    # Cardio
    ("Running", "cardio", "none", "cardio", "Easy conversational pace unless the plan says otherwise."),
    ("Cycling", "cardio", "bike", "cardio", "Keep the cadence steady, roughly 80 to 100 rpm."),
    ("Rowing Machine", "cardio", "rower", "cardio", "Legs, then back, then arms, and reverse it coming back."),
    ("Swimming", "cardio", "none", "cardio", "Long relaxed strokes, breathe out under the water."),
    ("Brisk Walk", "cardio", "none", "cardio", "Fast enough that talking takes a little effort."),
    ("Jump Rope", "cardio", "other", "timed", "Small hops on the balls of the feet, wrists doing the turning."),
]


def seed_exercises():
    # Only seeds an empty table. Checking the whole table rather than
    # each name means a user who deleted something from the shared set
    # (once that's possible) doesn't get it quietly re-added.
    if Exercise.query.first() is not None:
        return

    for name, muscle, equipment, kind, cue in _SEED:
        db.session.add(
            Exercise(
                name=name,
                muscle_group=muscle,
                equipment=equipment,
                kind=kind,
                instructions=cue,
            )
        )
    db.session.commit()
