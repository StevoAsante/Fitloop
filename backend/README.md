# FitLoop backend (prototype)

Python/Flask API covering the data layer, statistical anomaly detection,
and rule-based coach logic. This is what the mobile app will talk to
over HTTP, nothing here assumes Flutter vs React Native.

## Structure

- `models.py` - SQLAlchemy models: User, DailyLog, FriendConnection, Comment, Reaction
- `anomaly_detection.py` - rolling z-score and streak detection. No ML model, just each user's own recent history as the baseline
- `coach.py` - turns a detected streak into a message, gentle or direct depending on the user's coaching_style
- `app.py` - the Flask app and the routes that tie the above together

## Running it

```bash
pip install -r requirements.txt
python app.py
```

This creates `fitloop.db` (SQLite) on first run. Fine for development,
swap the `SQLALCHEMY_DATABASE_URI` in `app.py` for Postgres before
deploying anywhere real.

## Endpoints so far

- `POST /register` - create a user (username, email, password)
- `POST /login` - check a password, returns the user id (not a real token yet, see the comment in app.py)
- `POST /logs` - log a day's sleep/steps/mood/study hours (log_date optional, defaults to today, pass it explicitly to backfill)
- `GET /users/<id>/logs?days=7` - the last N days of raw logs, oldest first (powers the mobile app's week strip)
- `GET /users/<id>/coach-check` - checks the last 14 days for streaks and returns any coach messages

Tested end to end in `quick_test.py` while building this (registers a
user, logs 10 normal nights then 3 short ones, confirms the coach-check
picks up the sleep streak, checks a wrong password gets rejected and a
missing user 404s). Not part of the deliverable, just how this was
checked before handing it over, delete it or turn it into a proper
pytest suite, whichever's more useful for the report.

## What's deliberately not here yet

- Real authentication (JWT or session tokens)
- Social feed routes (Comment and Reaction have models, no endpoints yet)
- Charts / visualisation - a client-side concern once the mobile framework is picked
- The ML stretch goals (behavioural clustering, engagement prediction)
- `detect_metric_anomaly` in `anomaly_detection.py` (single-day z-score) exists but isn't called from `app.py` yet, useful once there's a coach message for a sudden spike/drop rather than a multi-day streak

## Tuning notes

`anomaly_detection.py` uses a 1.5 standard deviation threshold and
`coach.py`'s streak check uses a 3-day minimum. Both are starting
guesses, not derived from real usage data, since there isn't any yet.
Expect to adjust both after the usability test, that's what it's for.
