/** 认证 API */
import apiClient from './client'

export const authApi = {
  register: (data: { username: string; email: string; password: string; confirm_password: string }) => apiClient.post('/auth/register', data),
  login: (data: { username: string; password: string }) => apiClient.post('/auth/login', data),
}
