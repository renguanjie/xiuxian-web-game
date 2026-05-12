/** Pinia 认证状态管理 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

interface UserInfo {
  id: number
  username: string
  avatar?: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))

  const isAuthenticated = computed(() => !!accessToken.value)

  async function login(username: string, password: string) {
    const res: any = await authApi.login({ username, password })
    if (!res.data?.access_token) {
      throw new Error('登录响应异常，请重试')
    }
    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token
    user.value = res.data.user
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
  }

  async function register(username: string, email: string, password: string, confirmPassword: string) {
    const res = await authApi.register({ username, email, password, confirm_password: confirmPassword })
    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token
    user.value = res.data.user
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
  }

  function logout() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  return { user, accessToken, refreshToken, isAuthenticated, login, register, logout }
})
