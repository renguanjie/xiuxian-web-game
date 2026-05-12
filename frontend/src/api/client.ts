/** Axios 实例 + 拦截器 */
import axios from 'axios'
import router from '@/router'

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v?: any) => void; reject: (e: any) => void }> = []

function processQueue(error: any) {
  for (const req of failedQueue) {
    if (error) req.reject(error)
    else req.resolve()
  }
  failedQueue = []
}

async function refreshTokenFn(): Promise<string | null> {
  const rt = localStorage.getItem('refresh_token')
  if (!rt) return null
  try {
    const resp = await axios.post('/api/v1/auth/refresh', { refresh_token: rt })
    const data = resp.data.data || resp.data
    const newAccess = data.access_token
    const newRefresh = data.refresh_token
    localStorage.setItem('access_token', newAccess)
    if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
    return newAccess
  } catch {
    return null
  }
}

// 请求拦截器: 附加 JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器: 统一错误处理 + token 自动刷新
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => apiClient(originalRequest))
      }

      isRefreshing = true
      const newToken = await refreshTokenFn()
      isRefreshing = false
      processQueue(null)

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      // 刷新失败，清除登录状态
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      router.push('/games')
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default apiClient
