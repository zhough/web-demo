<template>
  <div style="padding: 50px; font-family: Arial">
    <h1>Vue (5002) → 代理 (8000) → Python Agent (5000, 皮肤诊断)</h1>
    
    <!-- 输入框：user_query + 上传图片 -->
    <input v-model="userQuery" placeholder="输入症状，如：皮肤红肿" style="width: 300px; padding: 10px;">
    <input type="file" @change="handleImage" accept="image/*" style="margin-left: 10px;">
    <button @click="startSSE" style="margin-left: 10px; padding: 10px;">SSE 流式诊断 (fetch)</button>
    <button @click="startWebSocket" style="margin-left: 10px; padding: 10px;">WebSocket 流式诊断</button>
    
    <!-- 结果显示 -->
    <pre>{{ result }}</pre>
    <div v-if="streamActive" style="border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; background: #f5f5f5;">
      <h3>流式诊断结果（实时）：</h3>
      <p v-for="(chunk, index) in streamChunks" :key="index" style="margin: 5px 0; white-space: pre-wrap;">{{ chunk }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const userQuery = ref('皮肤红肿，请诊断')
const imageBase64 = ref(null)
const result = ref('')
const streamActive = ref(false)
const streamChunks = ref([])
let ws = null

// 图片转 base64
const handleImage = (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      imageBase64.value = ev.target.result.split(',')[1]  // 纯 base64（去掉 data:image/...）
    }
    reader.readAsDataURL(file)
  }
}

// 【修复】SSE 流式：用 fetch POST + ReadableStream（支持流式，无 axios 错误）
const startSSE = async () => {
  if (streamActive.value) return  // 避免重复
  streamActive.value = true
  streamChunks.value = []
  result.value = '开始 SSE 诊断...'

  try {
    const response = await fetch('/api/service1/generate', {
      method: 'POST',  // 【关键】POST
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_query: userQuery.value,
        ID: 'vue-test',
        image_base64: imageBase64.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // 【关键】用 ReadableStream 实时读取 chunk（兼容 SSE 格式）
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      fullContent += chunk

      // 解析 SSE 块（可选：如果后端是纯文本 chunk，直接追加）
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)  // 去掉 'data: '
          if (data !== '[DONE]') {  // 忽略结束标记
            streamChunks.value.push(data)
            result.value += data
          }
        } else if (line.trim() && !line.startsWith(':')) {
          streamChunks.value.push(line)  // 非 SSE 格式，直接追加
          result.value += line
        }
      }

      // 模拟 UI 更新（避免阻塞）
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    result.value += '\n诊断完成！'
  } catch (e) {
    result.value = 'SSE 失败：' + e.message
    console.error('SSE 错误：', e)
  } finally {
    streamActive.value = false
  }
}

// 【修复】WebSocket：加重连逻辑（关闭后可重复用）
const startWebSocket = () => {
  // 如果已连接或正在连接，忽略
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log('WebSocket 已连接中...')
    return
  }

  // 如果已关闭，重新创建
  if (ws && ws.readyState === WebSocket.CLOSED) {
    ws = null
  }

  streamActive.value = true
  streamChunks.value = []
  result.value = '开始 WebSocket 诊断...'

  ws = new WebSocket('ws://' + location.host + '/api/ws')

  ws.onopen = () => {
    console.log('WebSocket 打开')
    // 发送请求
    ws.send(JSON.stringify({
      user_query: userQuery.value,
      ID: 'vue-test',
      image_base64: imageBase64.value
    }))
  }

  ws.onmessage = (event) => {
    const chunk = event.data
    streamChunks.value.push(chunk)
    result.value += chunk
    console.log('WebSocket chunk：', chunk)
  }

  ws.onerror = (err) => {
    console.error('WebSocket 错误：', err)
    result.value = 'WebSocket 失败：连接错误'
    streamActive.value = false
  }

  ws.onclose = (event) => {
    console.log('WebSocket 关闭（代码：', event.code, '，原因：', event.reason, '）')
    streamActive.value = false
    ws = null  // 清空，允许下次重连
  }
}

// 清理（页面关闭时）
onUnmounted(() => {
  if (ws) {
    ws.close()
    ws = null
  }
})
</script>