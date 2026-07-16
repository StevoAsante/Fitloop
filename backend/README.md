# FitLoop backend (prototype)

Python/Flask API covering the data layer, statistical anomaly detection,
and rule-based coach logic. This is what the mobile app talks to over
HTTP, nothing here assumes iOS, Android, or web specifically.

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

- `POST /register` - create a user (username, email, password, optional theme_color)
- `POST /login` - check a password, returns the user (not a real token yet, see the comment in app.py)
- `PATCH /users/<id>/settings` - update theme_color and/or coaching_style, whichever's included in the request
- `POST /logs` - log a day's sleep/steps/mood/study hours (log_date optional, defaults to today, pass it explicitly to backfill)
- `GET /users/<id>/logs` - the last `days` (default 7) logged days, oldest first
- `GET /users/<id>/coach-check` - checks the last 14 days for streaks and returns any coach messages

Tested end to end in `quick_test.py` while building this (registers a
user, checks a wrong password gets rejected, updates settings, checks
CORS headers are actually present, logs 10 normal nights then 3 short
ones, confirms coach-check picks up the sleep streak, checks a missing
user 404s). Not part of the deliverable, just how this was checked
before handing it over, delete it or turn it into a proper pytest suite,
whichever's more useful for the report.

## CORS

`CORS(app)` is on in `app.py`, wide open for local development. Without
it the browser blocks every request the mobile app makes once it's
running on web, since the Expo dev server and this API sit on different
ports and Flask doesn't send the right headers by default. Native builds
never hit this, a phone isn't a browser, which is exactly why this bug
only ever showed up when testing on web and not on a simulator or
device. Tighten this to the actual deployed origin before this goes
anywhere near production.

## What's deliberately not here yet

- Real authentication (JWT or session tokens)
- Social feed routes (Comment and Reaction have models, no endpoints yet)
- Charts / visualisation - a client-side concern
- The ML stretch goals (behavioural clustering, engagement prediction)
- `detect_metric_anomaly` in `anomaly_detection.py` (single-day z-score) exists but isn't called from `app.py` yet, useful once there's a coach message for a sudden spike/drop rather than a multi-day streak

## Tuning notes

`anomaly_detection.py` uses a 1.5 standard deviation threshold and
`coach.py`'s streak check uses a 3-day minimum. Both are starting
guesses, not derived from real usage data, since there isn't any yet.
Expect to adjust both after the usability test, that's what it's for.
