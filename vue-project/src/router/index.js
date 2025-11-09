import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Diagnosis from '../views/Diagnosis.vue'
import Myself from '../views/Myself.vue'
import Intraduction from '../views/Introduction.vue'
import Introduction from '../views/Introduction.vue'
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

  {
    path: '/myself',
    name: 'Myself',
    component: Myself
  },
  
  {
    path: '/introduction',
    name :'Introduction',
    component: Introduction
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router