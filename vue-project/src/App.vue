<template>
  <div id="app">
    <router-view />  <!-- 【关键】渲染当前路由页面 -->
  </div>
</template>

<script setup>
  import { useUserStore } from '@/stores/user'
  import { onMounted } from 'vue'
  const userStore = useUserStore()
  onMounted(() => {
    userStore.initUserId()
  })
</script>

<style>
#app { font-family: Arial; }
</style>