<template>
  <div v-if="game">
    <div class="flex items-start justify-between mb-4">
      <h1 class="text-xl sm:text-2xl font-bold">{{ game.name }}</h1>
    </div>

    <GamePlayer :path="game.path" />

    <section class="mt-4 sm:mt-6 bg-bg-secondary rounded-game p-4 sm:p-6 animate-slide-up">
      <h2 class="text-lg font-semibold mb-2">游戏描述</h2>
      <p class="text-text-secondary leading-relaxed">{{ game.description }}</p>
      <div class="flex gap-2 mt-4 text-xs text-text-muted">
        <span v-for="tag in game.tags" :key="tag" class="px-2 py-1 rounded bg-bg-tertiary">
          {{ tag }}
        </span>
        <span class="px-2 py-1 rounded bg-bg-tertiary">v{{ game.version }}</span>
      </div>
    </section>

    <section class="mt-4 bg-bg-secondary rounded-game p-4 sm:p-6 animate-slide-up">
      <h2 class="text-lg font-semibold mb-2">操作说明</h2>
      <p class="text-text-secondary text-sm leading-relaxed">
        使用键盘、鼠标或游戏内触控按钮进行操作，具体按键以游戏画面内提示为准。
      </p>
    </section>

    <section v-if="recommendedGames.length > 0" class="mt-8 animate-slide-up">
      <h2 class="text-lg font-semibold mb-4">同类游戏</h2>
      <GameGrid>
        <GameCard v-for="entry in recommendedGames" :key="entry.id" :game="entry" />
      </GameGrid>
    </section>
  </div>

  <div v-else class="text-center py-16 text-text-muted animate-fade-in">
    游戏不存在
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findGame, listGames } from '@/data/games'
import GamePlayer from '@/components/game/GamePlayer.vue'
import GameCard from '@/components/game/GameCard.vue'
import GameGrid from '@/components/game/GameGrid.vue'

const route = useRoute()
const game = computed(() => findGame(route.params.slug as string))
const recommendedGames = computed(() => {
  if (!game.value) return []
  return listGames(game.value.category).filter((entry) => entry.id !== game.value?.id)
})
</script>
