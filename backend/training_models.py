# ------------------------------------------------------
# training_models.py — Workout Tracking Models
# ------------------------------------------------------
# Everything the gym side of FitLoop stores: the exercise
# library, routines, the weekly plan, and the workouts
# people actually log. Lives in its own file so models.py
# stays about accounts and daily wellbeing, and importing
# it anywhere is enough for db.create_all() to pick the
# tables up, no migration needed for an existing dev db
# because none of these touch the users table
# ------------------------------------------------------

from datetime import datetime

from models import db


class Exercise(db.Model):
    __tablename__ = "exercises"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    muscle_group = db.Column(db.String(30), nullable=False)
    equipment = db.Column(db.String(40), nullable=False, default="bodyweight")
    instructions = db.Column(db.Text, nullable=True)

    # How an exercise gets logged decides which inputs the app shows,
    # so it's stored on the exercise itself rather than guessed from
    # the name (the old trick of matching "run" or "swim" in a string
    # breaks the moment someone names a custom exercise something odd):
    #   strength   -> weight + reps
    #   bodyweight -> reps, with optional added weight (dip belt etc)
    #   timed      -> seconds held (planks, hangs, carries)
    #   cardio     -> minutes + distance
    kind = db.Column(db.String(12), nullable=False, default="strength")

    # Null means it's part of the shared library. A user id means it's
    # their own custom exercise and only they should ever see it.
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)


class Routine(db.Model):
    __tablename__ = "routines"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship(
        "RoutineExercise",
        backref="routine",
        order_by="RoutineExercise.position",
        cascade="all, delete-orphan",
    )


class RoutineExercise(db.Model):
    __tablename__ = "routine_exercises"

    id = db.Column(db.Integer, primary_key=True)
    routine_id = db.Column(db.Integer, db.ForeignKey("routines.id"), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercises.id"), nullable=False)
    position = db.Column(db.Integer, nullable=False)

    target_sets = db.Column(db.Integer, nullable=False, default=3)
    # A rep range rather than one number, because double progression
    # (see progression.py) needs somewhere to climb through before it
    # adds weight. A fixed 5x5 is just rep_min == rep_max.
    rep_min = db.Column(db.Integer, nullable=False, default=8)
    rep_max = db.Column(db.Integer, nullable=False, default=12)
    rest_seconds = db.Column(db.Integer, nullable=False, default=90)

    # "none", "linear" or "double". Chosen per exercise, since it's
    # normal to run linear on squat and double progression on curls.
    progression = db.Column(db.String(10), nullable=False, default="double")
    increment_kg = db.Column(db.Float, nullable=False, default=2.5)

    # Exercises sharing the same non-null number are a superset and get
    # logged back to back. Null means a normal standalone exercise.
    superset_group = db.Column(db.Integer, nullable=True)

    exercise = db.relationship("Exercise")


class PlanSlot(db.Model):
    # Maps a slot to a routine. What "slot_index" means depends on the
    # mode: in "weekly" it's the weekday (0 = Monday), in "rotation"
    # it's just the position in the A, B, C order. The mode is part of
    # the row, so flipping between the two doesn't wipe the other plan.
    __tablename__ = "plan_slots"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    mode = db.Column(db.String(10), nullable=False)
    slot_index = db.Column(db.Integer, nullable=False)
    routine_id = db.Column(db.Integer, db.ForeignKey("routines.id"), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "mode", "slot_index", name="one_routine_per_slot"),
    )


class PlanSettings(db.Model):
    # Its own tiny table instead of a column on User, so adding this
    # didn't mean altering a table that already has data in it.
    __tablename__ = "plan_settings"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    mode = db.Column(db.String(10), nullable=False, default="weekly")


class Workout(db.Model):
    __tablename__ = "workouts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    routine_id = db.Column(db.Integer, db.ForeignKey("routines.id"), nullable=True)
    name = db.Column(db.String(80), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    # Null while the session is still going. The app uses this to
    # offer "resume" if someone closes the tab or the phone kills it.
    finished_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    sets = db.relationship(
        "SetEntry",
        backref="workout",
        order_by="SetEntry.id",
        cascade="all, delete-orphan",
    )
    plan = db.relationship(
        "WorkoutExercise",
        backref="workout",
        order_by="WorkoutExercise.position",
        cascade="all, delete-orphan",
    )


class WorkoutExercise(db.Model):
    # A copy of the routine's exercise list taken when the workout
    # starts, rather than a live link back to the routine. Two reasons:
    # editing a routine next week shouldn't rewrite what you did today,
    # and an ad-hoc workout with no routine still needs somewhere to
    # keep "I added squats" before the first set is logged, otherwise a
    # page reload would make the empty exercise vanish.
    __tablename__ = "workout_exercises"

    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey("workouts.id"), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercises.id"), nullable=False)
    position = db.Column(db.Integer, nullable=False)

    target_sets = db.Column(db.Integer, nullable=False, default=3)
    rep_min = db.Column(db.Integer, nullable=False, default=8)
    rep_max = db.Column(db.Integer, nullable=False, default=12)
    rest_seconds = db.Column(db.Integer, nullable=False, default=90)
    progression = db.Column(db.String(10), nullable=False, default="double")
    increment_kg = db.Column(db.Float, nullable=False, default=2.5)
    superset_group = db.Column(db.Integer, nullable=True)

    exercise = db.relationship("Exercise")


class SetEntry(db.Model):
    __tablename__ = "set_entries"

    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey("workouts.id"), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercises.id"), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)

    # All nullable because which of these gets filled in depends on the
    # exercise kind. Weight is always kg in the database, the client
    # can convert for display later without touching stored history.
    weight_kg = db.Column(db.Float, nullable=True)
    reps = db.Column(db.Integer, nullable=True)
    duration_secs = db.Column(db.Integer, nullable=True)
    distance_km = db.Column(db.Float, nullable=True)

    # RPE on a 1 to 10 scale. Optional, plenty of people won't want it.
    effort = db.Column(db.Float, nullable=True)

    # "normal", "warmup" or "drop". Warm-ups never count towards PRs
    # or progression, otherwise a light set could mask a real stall.
    set_type = db.Column(db.String(10), nullable=False, default="normal")

    # Stored at log time so history can show the PR badge without
    # re-deriving it. Editing an old set recalculates it, see training.py.
    is_pr = db.Column(db.Boolean, nullable=False, default=False)

    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

    exercise = db.relationship("Exercise")
