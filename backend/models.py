"""
Data models for FitLoop.

Sleep, steps, mood and study hours all live on one DailyLog row per user
per day rather than in separate tables. The anomaly detection and coach
logic both need a full day's metrics together anyway, and splitting them
out would just mean joining them back on every read. Revisit this if a
feature ever needs multiple entries per day (e.g. logging naps).
"""

from datetime import date, datetime

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # A user preference, not a fixed setting, because the same alert
    # phrased two ways gets very different reactions. "gentle" softens
    # the wording; "direct" is shorter and more blunt. Default to gentle
    # since that matches the brief (prompts, not strict targets).
    coaching_style = db.Column(db.String(20), default="gentle")

    logs = db.relationship("DailyLog", backref="user", lazy=True)

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)


class DailyLog(db.Model):
    __tablename__ = "daily_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    log_date = db.Column(db.Date, default=date.today, nullable=False)

    # Nullable on purpose. A student who forgets to log study hours on a
    # given day shouldn't have the whole day dropped, and the detection
    # logic needs to tell "logged as 0" apart from "never logged".
    sleep_hours = db.Column(db.Float, nullable=True)
    steps = db.Column(db.Integer, nullable=True)
    mood = db.Column(db.Integer, nullable=True)  # 1-5 scale
    study_hours = db.Column(db.Float, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("user_id", "log_date", name="one_log_per_user_per_day"),
    )


class FriendConnection(db.Model):
    """
    A one-directional follow rather than a mutual friendship. Simpler to
    reason about for a prototype feed (A can see B's posts without B
    accepting anything), and easy to upgrade to mutual approval later if
    the usability test says people want that instead.
    """
    __tablename__ = "friend_connections"

    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    followed_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Reaction(db.Model):
    __tablename__ = "reactions"

    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.Integer, db.ForeignKey("daily_logs.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    # A small fixed set instead of free emoji, so the feed stays low
    # pressure rather than turning into a like-count contest.
    kind = db.Column(db.String(20), nullable=False)  # e.g. "nice", "same", "rooting_for_you"


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.Integer, db.ForeignKey("daily_logs.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
