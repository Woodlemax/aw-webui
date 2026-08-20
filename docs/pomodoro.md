# Pomodoro page

The `/pomodoro` page controls the background Pomodoro service provided by the
companion `aw-notify-rs` fork. The timer belongs to `aw-notify`, so it keeps
running when the web UI or Chrome is closed. Restarting ActivityWatch resets an
active timer.

## Features

- manual session start with one or more ActivityWatch categories;
- parent-category selection that includes all descendants;
- saved defaults for work, short break, long break, interval count, distraction
  timeout, notifications, and sound;
- pause, resume, stop, and explicit confirmation before each next phase;
- distraction countdown and warning actions: continue, pause, or stop;
- current category, AFK/monitoring status, and paginated session history;
- complete English and Russian interface text.

The default sequence is 25 minutes of work, 5 minutes of short break, and a
15-minute long break after every second work interval, for 8 work intervals.
Breaks do not check categories. AFK or a locked workstation pauses the timer
until the user resumes it manually.

## Local development

1. Run ActivityWatch in testing mode on port `5666`.
2. Run the companion `aw-notify` build with its loopback HTTP API on port
   `5667`.
3. Add the web UI development origin to the `aw-notify` configuration:

   ```toml
   pomodoro_allowed_origins = [
       "http://127.0.0.1:27180",
       "http://localhost:27180",
   ]
   ```

4. Install dependencies and start the UI:

   ```bash
   npm ci
   npm run serve
   ```

5. Open `http://127.0.0.1:27180/#/pomodoro`.

The page calls `http://127.0.0.1:5667/pomodoro`. If `aw-notify` is unavailable,
the page shows a retryable service-unavailable state instead of starting a
browser-owned timer.

## Manual check

Use a testing ActivityWatch database, then verify:

1. selecting a parent category disables its covered descendants;
2. the chosen categories and settings are restored after a page reload;
3. starting a session displays the current matching category;
4. pause/resume works and completed phases wait for confirmation;
5. moving to another or uncategorized activity shows the countdown, then the
   warning; returning before the timeout cancels it;
6. continuing from the warning schedules another warning after a fresh timeout;
7. stopping saves the session as interrupted, while finishing all work
   intervals saves it as completed;
8. the timer remains active after closing the page and Chrome.

System and Chrome notification delivery are integrated in later stages. This
page already exposes and persists their settings.
