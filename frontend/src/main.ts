import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'

import {
  ElButton, ElForm, ElFormItem, ElInput, ElDialog, ElPagination,
  ElMessage, ElDropdown, ElDropdownMenu, ElDropdownItem, ElIcon,
} from 'element-plus'

import { ArrowDown } from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './assets/styles/base.css'
import './assets/styles/theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.component('ElButton', ElButton)
app.component('ElForm', ElForm)
app.component('ElFormItem', ElFormItem)
app.component('ElInput', ElInput)
app.component('ElDialog', ElDialog)
app.component('ElPagination', ElPagination)
app.component('ElDropdown', ElDropdown)
app.component('ElDropdownMenu', ElDropdownMenu)
app.component('ElDropdownItem', ElDropdownItem)
app.component('ElIcon', ElIcon)
app.component('ArrowDown', ArrowDown)

app.config.globalProperties.$message = ElMessage

app.mount('#app')
