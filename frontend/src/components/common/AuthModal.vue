<!-- 全局认证弹窗 - 登录 / 注册 -->
<template>
  <el-dialog
    v-model="visible"
    width="420px"
    :show-close="true"
    :close-on-click-modal="false"
    :destroy-on-close="false"
    :append-to-body="true"
    @close="handleClose"
  >
    <template #header>
      <div class="flex gap-6 border-b border-white/10 -mb-5 -mx-6 px-6 pt-2">
        <span
          class="pb-3 cursor-pointer transition-colors font-bold text-lg"
          :class="activeTab === 'login' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-text-muted'"
          @click="activeTab = 'login'"
        >
          登录
        </span>
        <span
          class="pb-3 cursor-pointer transition-colors font-bold text-lg"
          :class="activeTab === 'register' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-text-muted'"
          @click="activeTab = 'register'"
        >
          注册
        </span>
      </div>
    </template>

    <!-- 登录表单 -->
    <el-form v-if="activeTab === 'login'" :model="loginForm" :rules="loginRules" ref="loginFormRef" label-position="top">
      <el-form-item label="用户名 / 邮箱" prop="username">
        <el-input v-model="loginForm.username" placeholder="请输入用户名或邮箱" size="large" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" show-password />
      </el-form-item>
      <el-button type="primary" size="large" class="w-full" :loading="loading" @click="handleLogin">
        登录
      </el-button>
    </el-form>

    <!-- 注册表单 -->
    <el-form v-else :model="registerForm" :rules="registerRules" ref="registerFormRef" label-position="top">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="registerForm.username" placeholder="3-32个字符" size="large" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="registerForm.email" type="email" placeholder="your@email.com" size="large" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="registerForm.password" type="password" placeholder="至少8位，含字母和数字" size="large" show-password />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" size="large" show-password />
      </el-form-item>
      <el-button type="primary" size="large" class="w-full" :loading="loading" @click="handleRegister">
        注册
      </el-button>
    </el-form>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { showAuthModal, authModalTab, closeAuthModal } from '@/stores/modal'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const authStore = useAuthStore()
const visible = ref(false)
const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)

const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const validatePasswordConfirm = (_rule: any, value: string, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度为 3-32 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少 8 位', trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: '密码需包含字母和数字', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePasswordConfirm, trigger: 'blur' },
  ],
}

// 同步外部弹窗状态
watch(showAuthModal, (val) => { visible.value = val })
watch(authModalTab, (val) => { activeTab.value = val })

// 切换 tab 时清除表单
watch(activeTab, (tab) => {
  if (tab === 'login') loginFormRef.value?.resetFields()
  else registerFormRef.value?.resetFields()
})

function handleClose() {
  closeAuthModal()
}

async function handleLogin() {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    visible.value = false
    closeAuthModal()
  } catch (err: any) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.register(registerForm.username, registerForm.email, registerForm.password, registerForm.confirmPassword)
    ElMessage.success('注册成功')
    visible.value = false
    closeAuthModal()
  } catch (err: any) {
    ElMessage.error(err.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>
