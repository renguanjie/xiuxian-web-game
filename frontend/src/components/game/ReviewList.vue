<!-- 游戏评论列表 -->
<template>
  <div class="mt-6 bg-bg-secondary rounded-xl p-6">
    <h2 class="text-lg font-semibold mb-4">玩家评论</h2>

    <!-- 发表评论 (仅登录可见) -->
    <div v-if="authStore.isAuthenticated" class="mb-6 pb-6 border-b border-white/10">
      <div class="flex gap-2 mb-3">
        <span
          v-for="r in 5"
          :key="r"
          class="text-2xl cursor-pointer transition-colors"
          :class="r <= form.rating ? 'text-yellow-400' : 'text-gray-600'"
          @click="form.rating = r"
        >
          {{ r <= form.rating ? '★' : '☆' }}
        </span>
      </div>
      <div class="flex gap-2">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="2"
          placeholder="写下你的游戏体验..."
          :maxlength="500"
          show-word-limit
          resize="none"
        />
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          发表
        </el-button>
      </div>
    </div>
    <div v-else class="mb-6 pb-6 border-b border-white/10 text-center text-text-muted">
      <span class="cursor-pointer text-primary-400 hover:underline" @click="openAuthModal('login')">
        登录后发表评论
      </span>
    </div>

    <!-- 评论列表 -->
    <div v-if="loading" class="text-center py-4 text-text-secondary">加载中...</div>
    <div v-else-if="reviews.length === 0" class="text-center py-4 text-text-muted">暂无评论</div>
    <div v-else class="space-y-4">
      <div v-for="review in reviews" :key="review.id" class="flex gap-3 pb-4 border-b border-white/5">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm">
          {{ review.user.username.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-text-primary">{{ review.user.username }}</span>
            <div class="flex text-yellow-400 text-xs">
              <span v-for="s in 5" :key="s">{{ s <= review.rating ? '★' : '☆' }}</span>
            </div>
            <span class="text-xs text-text-muted ml-auto">{{ formatDate(review.created_at) }}</span>
          </div>
          <p class="text-sm text-text-secondary leading-relaxed break-words">{{ review.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { openAuthModal } from '@/stores/modal'
import { reviewsApi } from '@/api/reviews'
import type { Review } from '@/api/reviews'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const reviews = ref<Review[]>([])
const loading = ref(false)
const submitting = ref(false)

const props = defineProps<{
  gameId: number
}>()

const form = reactive({
  content: '',
  rating: 5,
})

onMounted(() => {
  fetchReviews()
})

async function fetchReviews() {
  loading.value = true
  try {
    const res: any = await reviewsApi.list(props.gameId)
    reviews.value = res.data
  } catch {
    reviews.value = []
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!form.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true
  try {
    await reviewsApi.create(props.gameId, { content: form.content, rating: form.rating })
    ElMessage.success('评论成功')
    form.content = ''
    form.rating = 5
    await fetchReviews()
  } catch (err: any) {
    ElMessage.error(err.message || '评论失败')
  } finally {
    submitting.value = false
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN')
}
</script>
