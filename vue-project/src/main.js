import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'  // 【新增】导入路由
const app = createApp(App)
app.use(router)  // 【新增】用路由
app.mount('#app')