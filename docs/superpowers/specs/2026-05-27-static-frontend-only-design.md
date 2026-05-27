# Pure Static Frontend Deployment Design

Date: 2026-05-27

## Goal

Turn the project into a frontend-only game gallery that deploys without Python,
an API server, environment secrets, or a database. The deployed site must render
the home/game list and launch every retained game successfully.

## Scope

- Retain all 12 complete games currently stored under `games/`.
- Publish game assets as static frontend files under
  `frontend/public/games/<slug>/`.
- Keep the Vue application pages needed for browsing and playing games.
- Remove login, registration, comments, rankings, API clients, backend code,
  database setup, database configuration, server deployment routes, and
  documentation that tells operators to provision backend infrastructure.

## Architecture

The Vite frontend is the only deployed application. It owns a local typed game
catalog containing the metadata needed for cards and game detail views. The list
page filters that catalog in memory. The detail page looks up the slug in the
same catalog and passes `/games/<slug>/index.html` to the iframe player.

Vercel builds `frontend/` using the static build adapter. Requests for built
assets and files in `frontend/public/` resolve directly as files; client-side
routes fall back to the built `index.html`. There is no Python function and no
`/api` route in the deployed output.

## User Experience

- `/` redirects to or renders the game lobby.
- `/games` displays all 12 retained games with category filters.
- `/game/:slug` displays the selected game, description, controls, fullscreen
  action, and optional related games drawn from the local catalog.
- The game page no longer displays authentication, favorites tied to login,
  comments, leaderboard links, database-backed counts, ratings, or scores.
- Unknown slugs display the existing not-found empty state.

## Removal Boundaries

Frontend files dedicated to authentication, reviews, rankings, or API transport
are deleted after their imports and routes are removed. The Python FastAPI
application, models, schemas, services, database scripts, middleware, migration
files, and Python deployment dependencies are deleted because they are not part
of the static application.

Game runtime files are moved into the frontend public asset tree. Existing
incomplete or duplicate placeholder game assets in `frontend/public/games/`
are replaced by the 12 complete games now in `games/`, and the top-level
`games/` source directory is removed once the static copies are verified.

## Error Handling

With no network fetch for catalog content, database and API connection failures
cannot block page rendering. A missing catalog slug shows a game-not-found
message. A missing or unloadable static game resource continues to use the
iframe player's loading failure state.

## Verification

1. A static-configuration regression test asserts that Vercel contains only the
   frontend static build and SPA/static-file routing, with no Python or API
   backend entry.
2. A catalog/resource check asserts all 12 canonical game slugs are represented
   in the static published files and no frontend source imports removed API,
   authentication, comment, or leaderboard modules.
3. `npm run build` in `frontend/` succeeds.
4. A local preview is opened in a browser: the lobby renders game cards and at
   least one retained game opens in its iframe without an API request.

## Out Of Scope

User accounts, favorites synced across devices, reviews, leaderboards,
score persistence, administration, and database migrations are intentionally
removed rather than simulated locally.
