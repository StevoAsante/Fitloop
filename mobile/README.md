# FitLoop mobile

Expo + Expo Router + TypeScript, targeting iOS, Android, and web from one
codebase. Talks to the Flask backend over HTTP, nothing native or
platform-specific in how it does that.

## Structure

- `src/app/` - screens (Expo Router, file-based: each file is a route)
  - `_layout.tsx` - root layout, loads fonts, wraps everything in AuthProvider then ThemeProvider
  - `index.tsx` - redirects to `/home` or `/login` depending on auth state
  - `login.tsx`, `register.tsx` - the auth flow, register includes picking a prestige colour
  - `home.tsx` - the streak seal, week strip, coach messages, quick log form
  - `settings.tsx` - change prestige colour or coaching style, log out
- `src/components/` - `PrestigeSeal`, `ThemeSwatchPicker`, `WeekStrip`, `CoachMessageCard`, and `ui/` (`Button`, `Card`, `ScreenContainer`, `TextField`)
- `src/constants/theme.ts` - colours (including the five prestige tones), spacing, radius, type scale
- `src/lib/api.ts` - typed fetch wrapper for every backend endpoint
- `src/lib/auth-context.tsx` - in-memory session (see the comment in that file for why it's not persisted yet)
- `src/lib/theme-context.tsx` - which prestige colour is active right now, kept in sync with the signed-in account

## Design system

Strava-shaped rather than Strava-coloured: bold condensed numbers for
stats, a dark hero card for the day's headline number, cards and pills
rather than flat lists, but the accent is one of five jewel tones
(Royal Purple, Emerald, Sapphire, Burgundy, Gold) that the person picks
at registration and can change any time in Settings, not a fixed brand
orange. Two custom typefaces carry that: Fraunces (a serif with some
personality) for titles and the wordmark, Big Shoulders Display (bold,
condensed) for anything that should read as a stat at a glance. Body
text stays on the system font, it's tuned for legibility on each OS and
there's no reason to fight that for running text. See the comment block
at the top of `constants/theme.ts` for the full reasoning.

## Running it

```bash
npm install
cp .env.example .env   # then edit the value, see below
npx expo start
```

The backend needs to be running too (`python app.py` in the backend
folder). It binds to `0.0.0.0` rather than just localhost so a phone on
the same network can reach it, and has CORS enabled so the web build
can reach it, see the CORS section in the backend README if you hit a
"could not reach the server" error specifically when running on web.

### Setting EXPO_PUBLIC_API_URL

"localhost" doesn't mean the same thing in every place this can run:

| Running where | Set it to |
|---|---|
| Web (`npx expo start --web`) | `http://localhost:5000` |
| iOS simulator | `http://localhost:5000` |
| Android emulator | `http://10.0.2.2:5000` (the emulator's alias for the host machine) |
| Physical phone, Expo Go | `http://<your computer's LAN IP>:5000`, e.g. `http://192.168.1.23:5000`. Find it with `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows). Phone and computer need to be on the same Wi-Fi. |

## What's here vs. what's a deliberate cut

Done: the auth flow with a live colour preview at sign up, the home
screen (streak seal, week strip, coach messages, a quick sleep/steps
log), a settings screen for changing colour or coaching style later,
the shared design system with two custom typefaces.

Cut for this pass, not forgotten:

- **No persisted session.** Closing the app logs you out. Matches the
  backend's placeholder auth (a real user id, no actual token), so
  there's nothing worth persisting securely yet. Revisit both together.
- **Mood and study hours aren't in the quick-log form yet.** The API
  and data model already support them, the coach just doesn't reason
  about either metric yet (see `METRIC_RULES` in the backend's
  `app.py`), so there's no form for data nothing reads back.
- **Social layer isn't here at all.** Comment and Reaction exist as
  backend models with no routes or screens yet, that's the next slice
  of work, not this one.
- **The streak seal only counts logging consistency**, not a specific
  metric being "good", on purpose, a big proud number should always be
  something to feel good about, not accidentally celebrate a bad sleep
  week just because it was consistently bad.

## Verification

`npx tsc --noEmit` and `npx expo export --platform web` were both run
clean against this exact code before handing it over. The exported
`dist/` output was checked for real rendered content (not an empty
shell) on all seven routes, and for both custom font families actually
being bundled into the output, not just referenced.
