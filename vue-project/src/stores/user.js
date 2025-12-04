import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const userId = ref('示例用户')

  const setUserId = (id) => {
    userId.value = id
    // 可选：持久化
    localStorage.setItem('userId', id)
  }

  const getUserId = () => userId.value

  // 初始化：从localStorage恢复
  const initUserId = () => {
    const saved = localStorage.getItem('userId')
    if (saved) userId.value = saved
  }

  return { userId, setUserId, getUserId, initUserId }
})