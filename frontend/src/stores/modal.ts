/** 控制全局弹窗显示状态 */
import { ref } from 'vue'

export const showAuthModal = ref(false)
export const authModalTab = ref<'login' | 'register'>('login')

export function openAuthModal(tab: 'login' | 'register' = 'login') {
  authModalTab.value = tab
  showAuthModal.value = true
}

export function closeAuthModal() {
  showAuthModal.value = false
}
