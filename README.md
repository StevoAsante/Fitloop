# FitLoop

Health and fitness social app for students, final-year university
project. Logs sleep, steps, mood and study hours, flags patterns worth
noticing (a sleep streak, a quiet week activity-wise) with statistical
anomaly detection rather than a trained model, and surfaces them through
a rule-based AI coach that suggests small changes instead of setting
strict targets.

## Layout

This is two projects in one repo, a Python backend and a React Native
frontend, talking to each other over HTTP. Each has its own README with
the actual setup steps.

- **`backend/`** - Flask API: data models, the anomaly detection module, the coach logic, the routes tying them together
- **`mobile/`** - Expo + Expo Router + TypeScript, one codebase targeting iOS, Android, and web

## Running the whole thing locally

```bash
# terminal 1
cd backend
pip install -r requirements.txt
python app.py

# terminal 2
cd mobile
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL, see mobile/README.md
npx expo start
```

## Where things stand

Working end to end: registration (including picking a prestige colour),
login, daily logging, the coach picking up on sleep/activity streaks and
turning them into a message, the streak seal and week view on the home
screen, and a settings screen for changing colour or coaching style
later.

Workout tracking is in too, on all three platforms (iOS, Android and
web, from the same code). There's a Train tab with a live workout
logger (sets saved as you go, rest timer, progression suggestions,
record detection), a Plan tab for routines and a weekly or rotating
schedule, a searchable exercise library with custom exercises, and a
Progress tab with a session calendar, weekly sets per muscle and
history. The coach also notices when two planned sessions in a row
get missed. To sanity check the API side by hand, run
`python training_test.py` from `backend/` (it wipes `fitloop.db`).

Not built yet, by design rather than by accident, each is documented in
more detail in its own folder's README:

- Social feed (Comment and Reaction exist as backend models, no routes or screens yet), including sharing PRs and finished workouts to it
- Pounds as a display unit (everything is stored in kg, the screens just show kg for now)
- Rest-timer notifications while the app is in the background
- Session persistence across app restarts
- Mood and study hours in the quick-log form (the coach doesn't reason about either metric yet)

## Design direction

Strava-shaped, not Strava-coloured: bold condensed stat numbers, a dark
hero card for the day's headline figure, cards and pills rather than
flat lists. The accent is a "prestige" colour the person picks for
themselves, one of five jewel tones (Royal Purple, Emerald, Sapphire,
Burgundy, Gold), set at registration and changeable any time in
Settings, so the whole app is tinted in a colour that's actually theirs
rather than a fixed house brand. See `mobile/README.md`'s design system
section for the full reasoning, including the two custom typefaces.

## Why the AI coach is rule-based, not a trained model

Worth stating up front since it comes up in the report: the anomaly
detection is a rolling z-score against each user's own recent history,
and the coach is if/else logic mapping a detected streak to a message.
No training data exists yet to justify anything fancier, and a
rule-based system is much easier to guarantee never produces an
alarming message, which matters given the brief is gentle prompts, not
strict alerts. The clustering / engagement-prediction stretch goals from
the original planning notes would sit on top of this layer later without
needing to change how it works.
