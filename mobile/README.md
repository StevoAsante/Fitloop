# FitLoop mobile

Expo + Expo Router + TypeScript, targeting iOS, Android, and web from one
codebase. Talks to the Flask backend over HTTP, nothing native or
platform-specific in how it does that.

## Structure

- `src/app/` - screens (Expo Router, file-based: each file is a route)
  - `_layout.tsx` - root layout, wraps everything in AuthProvider
  - `index.tsx` - redirects to `/home` or `/login` depending on auth state
  - `login.tsx`, `register.tsx` - the auth flow
  - `home.tsx` - week strip, any coach messages, quick log-entry form
- `src/components/` - `WeekStrip`, `CoachMessageCard`, and `ui/` (`Button`, `Card`, `ScreenContainer`, `TextField`)
- `src/constants/theme.ts` - colours, spacing, radius, type scale
- `src/lib/api.ts` - typed fetch wrapper for every backend endpoint
- `src/lib/auth-context.tsx` - in-memory session (see the comment in that file for why it's not persisted yet)

## Running it

\`\`\`bash
npm install
cp .env.example .env   # then edit the value, see below
npx expo start
\`\`\`

The backend needs to be running too (\`python app.py\` in the backend
folder), and per the comment on its \`app.run()\` call, it now binds to
\`0.0.0.0\` rather than just localhost, so a phone on the same network can
actually reach it.

### Setting EXPO_PUBLIC_API_URL

"localhost" doesn't mean the same thing in every place this can run:

| Running where | Set it to |
|---|---|
| Web (\`npx expo start --web\`) | \`http://localhost:5000\` |
| iOS simulator | \`http://localhost:5000\` |
| Android emulator | \`http://10.0.2.2:5000\` (the emulator's alias for the host machine) |
| Physical phone, Expo Go | \`http://<your computer's LAN IP>:5000\`, e.g. \`http://192.168.1.23:5000\`. Find it with \`ipconfig getifaddr en0\` (Mac) or \`ipconfig\` (Windows). Phone and computer need to be on the same Wi-Fi. |

## What's here vs. what's a deliberate cut

Done: the auth flow, the home screen (week strip, coach messages, a
quick sleep/steps log), the shared design system.

Cut for this pass, not forgotten:

- **No custom typeface.** \`theme.ts\` uses each platform's system font
  rather than a bundled one. A distinctive display face is worth doing,
  it's just a separate pass (loading fonts, checking they render
  correctly on all three platforms) rather than something to rush
  alongside getting the core flow working end to end.
- **No persisted session.** Closing the app logs you out. Matches the
  backend's placeholder auth (a real user id, no actual token), so
  there's nothing worth persisting securely yet. Revisit both together.
- **Mood and study hours aren't in the quick-log form yet.** The API
  and data model already support them, the coach just doesn't reason
  about either metric yet (see \`METRIC_RULES\` in the backend's
  \`app.py\`), so there's no form for data nothing reads back.
- **Social layer isn't here at all.** Comment and Reaction exist as
  backend models with no routes or screens yet, that's the next slice
  of work, not this one.

## Verification

TypeScript (\`npx tsc --noEmit\`) and the web export (\`npx expo export
--platform web\`) were both run against this exact code before handing
it over, see the note in the chat for the actual output. Neither had
been confirmed before this pass.
