<template>
  <div style="padding: 50px; text-align: center; font-family: Arial">
    <h1>皮肤病诊断系统</h1>
    <p>选择功能：</p>
    <div style="margin: 20px 0">
      <button @click="$router.push('/diagnosis')" style="margin: 10px; padding: 15px; font-size: 18px; background: #4CAF50; color: white; border: none; border-radius: 5px;">
        皮肤诊断
      </button>
      <button @click="$router.push('/feature2')" style="margin: 10px; padding: 15px; font-size: 18px; background: #2196F3; color: white; border: none; border-radius: 5px;">
        功能2（待定）
      </button>
      <button @click="$router.push('/feature3')" style="margin: 10px; padding: 15px; font-size: 18px; background: #FF9800; color: white; border: none; border-radius: 5px;">
        功能3（待定）
      </button>
    </div>
  </div>
</template>

<script setup>
// 主页逻辑（可选加导航守卫）
</script>