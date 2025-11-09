<template>
  <div style="padding: 50px; font-family: Arial; text-align: center;">
    <h1>功能2（待定）</h1>
    <p>这个页面即将开发中...</p>
    <button @click="$router.push('/')">返回主页</button>
  </div>
</template>

<script setup>
// 未来功能逻辑（如数据、API 调用）
import { onMounted } from 'vue'
onMounted(() => {
  console.log('Feature2 页面加载')
})
</script>