<!-- 排名徽章 -->
<template>
  <span
    class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
    :class="badgeClass"
  >
    {{ rankIcon }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ rank: number }>()

const rankIcon = props.rank > 0 && props.rank <= 3 ? ['🥇', '🥈', '🥉'][props.rank - 1] : props.rank

const badgeClass = computed(() => {
  if (props.rank === 1) return 'bg-yellow-500/20 text-yellow-400 shadow-glow'
  if (props.rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (props.rank === 3) return 'bg-orange-500/20 text-orange-400'
  return 'bg-white/5 text-text-muted'
})
</script>
