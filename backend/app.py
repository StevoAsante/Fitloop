# ------------------------------------------------------
# app.py — FitLoop Flask API
# ------------------------------------------------------
# The boundary the mobile app talks to over HTTP. Covers
# accounts, daily logging, the coach check, and account
# settings, nothing more yet. See the comment on /login
# before this touches real user data
# ------------------------------------------------------

from datetime import date, datetime

from flask import Flask, request, jsonify
from flask_cors import CORS

from models import db, User, DailyLog
from anomaly_detection import detect_streak
from coach import build_coach_message

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///fitloop.db"
db.init_app(app)

# Without this, the browser blocks every request the moment the mobile
# app runs on web, since it's then a cross-origin call (the Expo dev
# server and this API sit on different ports) and Flask doesn't send
# CORS headers by default. Native builds never hit this, a phone isn't
# a browser, which is exactly why the bug only ever showed up on web.
# Wide open for local development, tighten to the actual deployed
# origin before this goes anywhere near production.
CORS(app)

with app.app_context():
    db.create_all()

# Maps a coach-relevant metric to the DailyLog column it lives in and the
# condition that counts as worth flagging. Extend this as coach.py grows
# more templates. detect_metric_anomaly (single-day z-score, in
# anomaly_detection.py) isn't wired in here yet, none of the current
# templates are single-day ones, bring it in once there's a message for
# a sudden spike or drop rather than a multi-day streak.
METRIC_RULES = {
    "sleep": {
        "field": "sleep_hours",
        "condition": lambda hours: hours is not None and hours < 6,
    },
    "steps": {
        "field": "steps",
        "condition": lambda count: count is not None and count < 4000,
    },
}


def serialize_user(user):
    # One place that decides what a "user" looks like on the wire,
    # used by register, login, and settings, so all three stay in sync
    # automatically instead of three separate dicts slowly drifting
    # apart as fields get added.
    return {
        "id": user.id,
        "username": user.username,
        "theme_color": user.theme_color,
        "coaching_style": user.coaching_style,
    }


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    user = User(
        username=data["username"],
        email=data["email"],
        theme_color=data.get("theme_color", "royal_purple"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(serialize_user(user)), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get("username")).first()

    if user is None or not user.check_password(data.get("password", "")):
        return jsonify({"error": "invalid credentials"}), 401

    # Returning the raw id instead of a token is fine for local testing,
    # nothing past that. Swap for a signed JWT before the mobile app
    # talks to this over a real network.
    return jsonify(serialize_user(user))


@app.route("/users/<int:user_id>/settings", methods=["PATCH"])
def update_settings(user_id):
    """
    Updates whichever of theme_color / coaching_style were sent, leaves
    the other alone if it wasn't part of the request. The mobile app's
    settings screen saves each change the moment someone taps it rather
    than waiting on a separate "Save" button, so this needs to cope with
    a request that only touches one field at a time.
    """
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if "theme_color" in data:
        user.theme_color = data["theme_color"]
    if "coaching_style" in data:
        user.coaching_style = data["coaching_style"]

    db.session.commit()
    return jsonify(serialize_user(user))


@app.route("/logs", methods=["POST"])
def create_log():
    data = request.get_json()

    raw_date = data.get("log_date")
    log_date = datetime.strptime(raw_date, "%Y-%m-%d").date() if raw_date else date.today()

    log = DailyLog(
        user_id=data.get("user_id"),
        log_date=log_date,
        sleep_hours=data.get("sleep_hours"),
        steps=data.get("steps"),
        mood=data.get("mood"),
        study_hours=data.get("study_hours"),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"id": log.id}), 201


@app.route("/users/<int:user_id>/logs", methods=["GET"])
def get_logs(user_id):
    """
    Returns the user's most recent logs, oldest first. Exists mainly to
    power a week-at-a-glance view on the client, `days` defaults to 7 to
    match that, but is a query param rather than hardcoded so the same
    endpoint can serve a longer history screen later without changing.
    """
    days = request.args.get("days", default=7, type=int)
    logs = (
        DailyLog.query.filter_by(user_id=user_id)
        .order_by(DailyLog.log_date.desc())
        .limit(days)
        .all()
    )
    logs.reverse()

    return jsonify([
        {
            "date": log.log_date.isoformat(),
            "sleep_hours": log.sleep_hours,
            "steps": log.steps,
            "mood": log.mood,
            "study_hours": log.study_hours,
        }
        for log in logs
    ])


@app.route("/users/<int:user_id>/coach-check", methods=["GET"])
def coach_check(user_id):
    """
    Pulls the user's last 14 logged days, checks each metric in
    METRIC_RULES for a streak, and returns any coach messages worth
    showing. Kept separate from log creation, a message shouldn't fire
    the instant someone logs data, the mobile app can poll this on its
    own schedule instead (e.g. once when the app opens).
    """
    user = User.query.get_or_404(user_id)
    recent_logs = (
        DailyLog.query.filter_by(user_id=user_id)
        .order_by(DailyLog.log_date.desc())
        .limit(14)
        .all()
    )
    recent_logs.reverse()  # oldest first, matches what detect_streak expects

    messages = []
    for metric, rule in METRIC_RULES.items():
        values = [getattr(log, rule["field"]) for log in recent_logs]
        is_streak, streak_len = detect_streak(values, rule["condition"])
        if is_streak:
            message = build_coach_message(metric, streak_len, user.coaching_style)
            if message:
                messages.append(message.__dict__)

    return jsonify({"messages": messages})


if __name__ == "__main__":
    # host="0.0.0.0" on purpose: a phone running the mobile app over
    # Expo Go needs to reach this from elsewhere on the LAN, the default
    # 127.0.0.1 only accepts connections from the same machine, which
    # would make the app work in a browser or simulator and then quietly
    # fail on an actual phone with no obvious reason why.
    app.run(debug=True, host="0.0.0.0")
