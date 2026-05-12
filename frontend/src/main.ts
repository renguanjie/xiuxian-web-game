import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'

// 按需导入 Element Plus 组件
import { ElButton, ElForm, ElFormItem, ElInput, ElDialog, ElPagination, ElMessage } from 'element-plus'

import App from './App.vue'
import router from './router'
import './assets/styles/base.css'
import './assets/styles/theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 注册按需导入的组件
app.component('ElButton', ElButton)
app.component('ElForm', ElForm)
app.component('ElFormItem', ElFormItem)
app.component('ElInput', ElInput)
app.component('ElDialog', ElDialog)
app.component('ElPagination', ElPagination)

// 将 ElMessage 挂载到全局属性
app.config.globalProperties.$message = ElMessage

app.mount('#app')
