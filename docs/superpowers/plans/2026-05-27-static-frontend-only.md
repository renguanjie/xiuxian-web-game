# Pure Static Frontend Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the game gallery and all 12 games as a Vite-only static site with no platform login, comments, rankings, API server, or database dependency.

**Architecture:** A typed local catalog in `frontend/src/data/games.ts` replaces database-backed game reads. Vue renders list and detail pages entirely from that catalog while each canonical HTML game is published from `frontend/public/games/<path>/`; Vercel builds only the frontend and uses an SPA fallback.

**Tech Stack:** Vue 3, Vite, TypeScript, Vue Router, Element Plus, Node built-in test runner, Vercel static build.

---

## File Map

- Create `frontend/src/data/games.ts`: the single source of static game metadata and catalog lookup/filter helpers.
- Create `frontend/tests/static-site.test.mjs`: deployment and asset regression tests using `node:test`.
- Modify `frontend/package.json`: expose the Node regression test command and remove unused HTTP dependency.
- Modify `frontend/src/types/index.ts`: keep display metadata only; remove platform statistics fields.
- Modify `frontend/src/stores/games.ts`: filter the local catalog synchronously instead of calling an API.
- Modify `frontend/src/views/GamesListView.vue`: render catalog results without network loading states.
- Modify `frontend/src/views/GamePlayView.vue`: resolve local catalog data and remove auth, review, and platform-statistics UI.
- Modify `frontend/src/components/game/GameCard.vue`: show static metadata rather than database counts/ratings.
- Modify `frontend/src/components/game/GamePlayer.vue`: load `/games/...` directly and remove leaderboard navigation.
- Modify `frontend/src/components/layout/AppHeader.vue`, `frontend/src/router/index.ts`, and `frontend/src/main.ts`: remove authentication and leaderboard registrations/routes.
- Modify `frontend/vite.config.ts` and `vercel.json`: remove backend/API proxies and Python deployment.
- Replace `frontend/public/games/` from canonical `games/`, then remove the now redundant top-level source directory.
- Delete unused frontend API/auth/review/ranking modules and all Python/backend/database/deployment files.
- Replace `README.md`: document the static application, local run, build, and Vercel deploy flow.

### Task 1: Add Static-Site Regression Tests

**Files:**
- Create: `frontend/tests/static-site.test.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Add a Node test script and tests that describe the target deployment**

Add `"test": "node --test tests/*.test.mjs"` under `scripts` in `frontend/package.json`, and create `frontend/tests/static-site.test.mjs` with:

```js
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const frontendRoot = new URL('..', import.meta.url).pathname
const projectRoot = new URL('../..', import.meta.url).pathname
const expectedGameDirs = [
  'alchemy-immortal', 'ascension', 'beast-evolution', 'cultivation-angry',
  'cultivation-bomb', 'cultivation-mine', 'cultivation-snake',
  'cultivation-survivors', 'cultivation-sword',
  'cultivation-tower-defense', 'hammer-wall', 'xianjian-shooter',
]

test('vercel deploys a frontend-only static application', () => {
  const config = JSON.parse(readFileSync(join(projectRoot, 'vercel.json'), 'utf8'))
  assert.deepEqual(config.builds.map((build) => build.src), ['frontend/package.json'])
  assert.equal(JSON.stringify(config).includes('main.py'), false)
  assert.equal(JSON.stringify(config).includes('/api/'), false)
})

test('all canonical games are published from the frontend public directory', () => {
  const published = readdirSync(join(frontendRoot, 'public/games')).sort()
  assert.deepEqual(published, expectedGameDirs)
  for (const dir of expectedGameDirs) {
    assert.equal(existsSync(join(frontendRoot, 'public/games', dir, 'index.html')), true)
    assert.equal(existsSync(join(frontendRoot, 'public/games', dir, 'game.js')), true)
    assert.equal(existsSync(join(frontendRoot, 'public/games', dir, 'thumbnail.svg')), true)
  }
})

test('frontend source does not retain platform backend modules', () => {
  for (const removed of ['src/api', 'src/stores/auth.ts', 'src/stores/modal.ts', 'src/views/LeaderboardView.vue', 'src/components/game/ReviewList.vue']) {
    assert.equal(existsSync(join(frontendRoot, removed)), false, removed)
  }
})
```

- [ ] **Step 2: Run the regression tests to verify RED**

Run: `cd frontend && npm test`

Expected: FAIL because `vercel.json` still builds `main.py`, the static public directory does not contain the 12 canonical game folders, and platform backend modules still exist.

- [ ] **Step 3: Commit the red tests**

```bash
git add frontend/package.json frontend/tests/static-site.test.mjs
git commit -m "test: define frontend-only deployment expectations"
```

### Task 2: Replace API Data Reads With a Local Game Catalog

**Files:**
- Create: `frontend/src/data/games.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/stores/games.ts`
- Modify: `frontend/src/views/GamesListView.vue`
- Modify: `frontend/src/components/game/GameCard.vue`

- [ ] **Step 1: Define the display-only `Game` contract**

Reduce `Game` in `frontend/src/types/index.ts` to:

```ts
export interface Game {
  id: number
  name: string
  slug: string
  description: string
  thumbnail: string
  path: string
  category: string
  tags: string[]
  version: string
}
```

Extend `CATEGORY_LABELS` with `puzzle`, `platformer`, and `action` labels so all retained cards have readable categories.

- [ ] **Step 2: Add the local catalog**

Create `frontend/src/data/games.ts` exporting `GAMES`, `listGames(category?: string)`, and `findGame(slug: string)`. Add the 12 metadata records from `seed.py`, using public URLs such as:

```ts
{
  id: 1,
  name: '修仙幸存者',
  slug: 'survivor',
  description: '在妖兽横行的修仙世界中，你是唯一的幸存者！击杀妖兽，收集灵石，不断提升修为，看看你能坚持多久！',
  thumbnail: '/games/cultivation-survivors/thumbnail.svg',
  path: 'cultivation-survivors/index.html',
  category: 'survival',
  tags: ['动作', '幸存者', '修仙'],
  version: '1.0',
}
```

Use the original `slug`, description, `path`, category, and tags for the remaining eleven records.

- [ ] **Step 3: Replace list fetching with in-memory filtering**

In `frontend/src/stores/games.ts`, import `listGames` rather than `gamesApi`; initialize and update the store with:

```ts
const games = ref<Game[]>(listGames())
function filterGames(category?: string) {
  games.value = listGames(category)
}
return { games, filterGames }
```

Update `GamesListView.vue` to call `gamesStore.filterGames(...)` on category changes, and remove loading/error skeleton branches. Update `GameCard.vue` to show tags (or the description only) and remove `play_count` and `avg_score`.

- [ ] **Step 4: Type-check the local catalog changes**

Run: `cd frontend && npm run build`

Expected: FAIL only where detail/auth/ranking code still refers to removed properties or modules; these remaining compile errors identify Task 3 work.

### Task 3: Strip Platform Login, Comments, Ranking, and API UI

**Files:**
- Modify: `frontend/src/views/GamePlayView.vue`
- Modify: `frontend/src/components/game/GamePlayer.vue`
- Modify: `frontend/src/components/layout/AppHeader.vue`
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/main.ts`
- Delete: `frontend/src/api/auth.ts`
- Delete: `frontend/src/api/client.ts`
- Delete: `frontend/src/api/games.ts`
- Delete: `frontend/src/api/leaderboards.ts`
- Delete: `frontend/src/api/reviews.ts`
- Delete: `frontend/src/components/common/AuthModal.vue`
- Delete: `frontend/src/components/game/ReviewList.vue`
- Delete: `frontend/src/components/leaderboard/RankBadge.vue`
- Delete: `frontend/src/stores/auth.ts`
- Delete: `frontend/src/stores/modal.ts`
- Delete: `frontend/src/views/LeaderboardView.vue`

- [ ] **Step 1: Make the detail view read the local catalog**

In `GamePlayView.vue`, import `findGame` and resolve `game` synchronously:

```ts
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findGame, listGames } from '@/data/games'

const route = useRoute()
const game = computed(() => findGame(route.params.slug as string))
const recommendedGames = computed(() =>
  game.value ? listGames(game.value.category).filter((entry) => entry.id !== game.value?.id) : [],
)
```

Remove loading, auth/favorite handling, `ReviewList`, database-backed statistic cards, and their imports. Retain title, player, description, controls, and recommendations.

- [ ] **Step 2: Remove platform navigation and imports**

In `GamePlayer.vue`, remove the leaderboard `RouterLink`, remove `gameId` from props, and change the iframe URL to:

```ts
const gameUrl = computed(() => `/games/${props.path}`)
```

In `AppHeader.vue`, keep the logo, lobby navigation, and mobile menu; delete all login/register/dropdown/modal markup and imports. In `router/index.ts`, keep only `/`, `/games`, and `/game/:slug`; delete the auth store navigation guard. In `main.ts`, remove Element Plus component registrations used only by deleted authentication/ranking components.

- [ ] **Step 3: Delete unreachable platform modules**

Delete the files listed above and remove `axios` from `frontend/package.json` dependencies, followed by:

Run: `cd frontend && npm install --package-lock-only`

Expected: `package-lock.json` updates without `axios` as an application dependency.

- [ ] **Step 4: Build the stripped frontend**

Run: `cd frontend && npm run build`

Expected: PASS with no unresolved API, auth, comment, or ranking imports.

### Task 4: Publish Canonical Games and Remove the Backend Deployment

**Files:**
- Replace: `frontend/public/games/**`
- Delete: `games/**`
- Modify: `frontend/vite.config.ts`
- Modify: `vercel.json`
- Delete: backend Python source, Python tests, migrations, backend Docker/config scripts, `.env.example`, `DEPLOY.md`

- [ ] **Step 1: Move all canonical game resources into the static public tree**

Replace the existing four placeholder public game directories with the 12 directories from top-level `games/`, preserving each `index.html`, `game.js`, and `thumbnail.svg` file at:

```text
frontend/public/games/<canonical-directory>/{index.html,game.js,thumbnail.svg}
```

After verifying the new tree contains all 12 directories, delete top-level `games/`.

- [ ] **Step 2: Convert deployment configuration to static-only**

Replace `vercel.json` with:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "dest": "/frontend/assets/$1" },
    { "src": "/games/(.*)", "dest": "/frontend/games/$1" },
    { "src": "/favicon.svg", "dest": "/frontend/favicon.svg" },
    { "src": "/(.*)", "dest": "/frontend/index.html" }
  ]
}
```

Remove `server.proxy` from `frontend/vite.config.ts` because Vite serves `public/games/` directly.

- [ ] **Step 3: Delete backend-only files**

Delete `main.py`, `config.py`, `database.py`, `dependencies.py`, `rate_limit.py`, `dev.py`, `seed.py`, `rebuild_db.py`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `setup.sh`, `.env.example`, `DEPLOY.md`, `alembic.ini`, and directories `alembic/`, `exceptions/`, `middleware/`, `models/`, `routers/`, `schemas/`, `services/`, `utils/`, and root `tests/`.

- [ ] **Step 4: Run static regression tests to verify GREEN**

Run: `cd frontend && npm test`

Expected: PASS; Vercel has no Python/API entry, all 12 game resources are under `frontend/public/games`, and deleted platform modules are absent.

### Task 5: Update Documentation and Verify the Playable Site

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace backend-oriented documentation**

Update `README.md` to describe a Vue/Vite static game lobby with 12 games, these local commands:

```bash
cd frontend
npm install
npm run dev
npm test
npm run build
npm run preview
```

Document that Vercel deployment requires no database or secret variables and uses `vercel.json` to publish static assets and SPA routes.

- [ ] **Step 2: Run final automated verification**

Run:

```bash
cd frontend && npm test && npm run build
```

Expected: Both commands exit zero and the Vite output includes `dist/index.html` plus `dist/games/<canonical-directory>/index.html` for all 12 games.

- [ ] **Step 3: Run and inspect the static site**

Run: `cd frontend && npm run preview -- --host 127.0.0.1`

Open the resulting local URL with the in-app browser. Verify `/games` displays 12 game cards and `/game/survivor` embeds `/games/cultivation-survivors/index.html` visibly without `/api` requests.

- [ ] **Step 4: Commit implementation**

```bash
git add -A
git commit -m "refactor: convert platform to static game gallery"
```
