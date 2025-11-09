import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Diagnosis from '../views/Diagnosis.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home  // 主页
  },
  {
    path: '/diagnosis',
    name: 'Diagnosis',
    component: Diagnosis  // 诊断页面
  },
  // 其他功能待定（示例）
  {
    path: '/feature2',
    name: 'Feature2',
    component: () => import('../views/Feature2.vue')  // 懒加载，未来加
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router