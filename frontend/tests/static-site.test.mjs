import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import test from 'node:test'

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(frontendRoot)
const expectedGameDirs = [
  'alchemy-immortal',
  'ascension',
  'beast-evolution',
  'cultivation-angry',
  'cultivation-bomb',
  'cultivation-mine',
  'cultivation-snake',
  'cultivation-survivors',
  'cultivation-sword',
  'cultivation-tower-defense',
  'hammer-wall',
  'xianjian-shooter',
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

  for (const gameDir of expectedGameDirs) {
    const root = join(frontendRoot, 'public/games', gameDir)
    assert.equal(existsSync(join(root, 'index.html')), true, `${gameDir} index`)
    assert.equal(existsSync(join(root, 'game.js')), true, `${gameDir} script`)
    assert.equal(existsSync(join(root, 'thumbnail.svg')), true, `${gameDir} thumbnail`)
  }
})

test('frontend source does not retain platform backend modules', () => {
  const removedPaths = [
    'src/api',
    'src/stores/auth.ts',
    'src/stores/modal.ts',
    'src/views/LeaderboardView.vue',
    'src/components/game/ReviewList.vue',
  ]

  for (const removedPath of removedPaths) {
    assert.equal(existsSync(join(frontendRoot, removedPath)), false, removedPath)
  }
})

test('the static shell does not ship a full component library for simple buttons', () => {
  const packageJson = JSON.parse(readFileSync(join(frontendRoot, 'package.json'), 'utf8'))
  assert.equal(packageJson.dependencies['element-plus'], undefined)

  for (const source of ['src/main.ts', 'src/views/GamesListView.vue', 'src/components/game/GamePlayer.vue']) {
    const content = readFileSync(join(frontendRoot, source), 'utf8')
    assert.equal(content.includes('element-plus'), false, source)
    assert.equal(content.includes('<el-button'), false, source)
  }
})
