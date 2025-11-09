<template>
  <div class="container">
    <!-- 历史消息展示区域 -->
    <div class="history-container" ref="chatContainer">
      <!-- 初始欢迎消息 -->
      <div v-if="messages.length === 0" class="welcome-message">
        <h3 class="welcome-title">欢迎使用皮肤诊断助手</h3>
        <p class="welcome-text">上传照片或描述您的症状，开始 AI 实时诊断</p>
      </div>
      <!-- 循环展示消息历史 -->
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.isUser ? 'user-message' : 'assistant-message']"
      >
        <div class="message-avatar" :class="message.isUser ? 'user-avatar' : 'ai-avatar'">
          {{ message.isUser ? 'U' : 'AI' }}
        </div>
        <div class="message-bubble">
          <div class="message-content" v-html="message.content"></div>
          <img
            v-if="message.imageUrl"
            class="message-image"
            :src="message.imageUrl"
            alt="上传图片"
          >
          <div class="message-time">{{ message.time }}</div>
        </div>
      </div>
      <!-- 流式 AI 消息（打字动画） -->
      <div v-if="streamActive" class="message assistant-message">
        <div class="message-avatar ai-avatar">AI</div>
        <div class="message-bubble">
          <div ref="aiBubble" class="message-content typing-animation" v-html="formattedStreamContent"></div>
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="message-time">正在生成...</div>
        </div>
      </div>
    </div>
    <!-- 输入交互区域 -->
    <div class="input-container">
      <h1>皮肤诊断助手</h1>
      
      <!-- 图片上传区域 -->
      <div
        class="image-upload"
        @click="triggerFileInput"
        @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop"
        :style="{ borderColor: isDragging ? '#2563eb' : '#ddd' }"
      >
        <p>点击或拖拽图片到此处上传（支持JPG/PNG）</p>
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          class="hidden"
          @change="handleImage"
        >
        <img
          v-if="imagePreview"
          class="image-preview"
          :src="imagePreview"
          alt="预览图"
        >
      </div>
      <!-- 文本输入框 -->
      <textarea
        v-model="userQuery"
        placeholder="描述您的症状..."
        @keydown="handleKeyDown"
        :disabled="streamActive"
      ></textarea>
      
      <!-- 发送按钮组 -->
      <div class="button-group">
        <button 
          @click="startSSE" 
          :disabled="streamActive || !userQuery.trim()"
          class="send-btn"
        >
          {{ streamActive ? '处理中...' : '发送 (SSE)' }}
        </button>
        <button 
          @click="startWebSocket" 
          :disabled="streamActive || !userQuery.trim()"
          class="ws-btn"
        >
          WS 实时
        </button>
      </div>
      <div class="status">{{ streamActive ? 'AI 正在响应...' : '就绪' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const userQuery = ref('皮肤红肿，请诊断')
const imageBase64 = ref(null)
const imagePreview = ref('')
const streamActive = ref(false)
const streamChunks = ref([])
const messages = ref([])  // 历史消息
const chatContainer = ref(null)
const aiBubble = ref(null)
const formattedStreamContent = ref('')  // 流式格式化内容
const fileInput = ref(null)
const isDragging = ref(false)

let ws = null

// 图片处理（添加预览和拖拽）
const handleImage = (e) => {
  const file = e.target.files?.[0]
  if (file) {
    imageBase64.value = null
    const reader = new FileReader()
    reader.onload = (ev) => {
      imagePreview.value = ev.target.result
      imageBase64.value = ev.target.result.split(',')[1]
    }
    reader.readAsDataURL(file)
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleDragOver = () => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    const dt = new DataTransfer()
    dt.items.add(file)
    fileInput.value.files = dt.files
    handleImage({ target: fileInput.value })
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    startSSE()
  }
}

// 添加消息到历史（格式化）
const addMessage = (content, isUser = false, imageUrl = '') => {
  messages.value.push({
    content: DOMPurify.sanitize(marked.parse(content)),
    isUser,
    imageUrl,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// SSE 流式（保持逻辑）
const startSSE = async () => {
  if (streamActive.value || !userQuery.value.trim()) return
  streamActive.value = true
  formattedStreamContent.value = ''
  const imageUrl = imagePreview.value
  addMessage(userQuery.value, true, imageUrl)

  try {
    const response = await fetch('/api/service1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_query: userQuery.value,
        ID: 'vue-test',
        image_base64: imageBase64.value
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      fullContent += chunk

      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data !== '[DONE]') {
            formattedStreamContent.value = DOMPurify.sanitize(marked.parse(fullContent))
          }
        } else if (line.trim() && !line.startsWith(':')) {
          formattedStreamContent.value = DOMPurify.sanitize(marked.parse(fullContent))
        }
      }

      nextTick(() => {
        if (aiBubble.value) {
          aiBubble.value.scrollIntoView({ behavior: 'smooth' })
        }
      })
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    if (fullContent) {
      addMessage(fullContent, false)
    }
  } catch (e) {
    addMessage('诊断失败：' + e.message, false)
  } finally {
    streamActive.value = false
    userQuery.value = ''
    imageBase64.value = null
    imagePreview.value = ''
  }
}

// WebSocket 流式（实时格式化）
const startWebSocket = () => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

  if (ws && ws.readyState === WebSocket.CLOSED) ws = null

  if (!userQuery.value.trim()) return

  streamActive.value = true
  formattedStreamContent.value = ''
  const imageUrl = imagePreview.value
  addMessage(userQuery.value, true, imageUrl)

  ws = new WebSocket(`ws://${location.host}/api/ws`)

  ws.onopen = () => {
    console.log('WebSocket 打开')
    ws.send(JSON.stringify({
      user_query: userQuery.value,
      ID: 'vue-test',
      image_base64: imageBase64.value
    }))
  }

  ws.onmessage = (event) => {
    const chunk = event.data
    streamChunks.value.push(chunk)
    const newContent = formattedStreamContent.value + chunk
    formattedStreamContent.value = DOMPurify.sanitize(marked.parse(newContent))
    nextTick(() => {
      if (aiBubble.value) {
        aiBubble.value.scrollIntoView({ behavior: 'smooth' })
      }
    })
    console.log('WebSocket chunk：', chunk)
  }

  ws.onerror = (err) => {
    console.error('WebSocket 错误：', err)
    addMessage('WebSocket 失败', false)
    streamActive.value = false
  }

  ws.onclose = (event) => {
    console.log('WebSocket 关闭', event.code, event.reason)
    if (formattedStreamContent.value) {
      addMessage(formattedStreamContent.value, false)
    }
    streamActive.value = false
    ws = null
    userQuery.value = ''
    imageBase64.value = null
    imagePreview.value = ''
  }
}

onUnmounted(() => {
  if (ws) ws.close()
})
</script>

<style scoped>
/* 基础样式设置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
body {
  background-color: #f8f9fa;
  color: #2d3436;
  line-height: 1.5;
  font-size: 16px;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  height: 100vh;
}
/* 历史消息区域样式 */
.history-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  overflow-y: auto;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
}
.history-container::-webkit-scrollbar {
  width: 6px;
}
.history-container::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}
.welcome-message {
  text-align: center;
  padding: 40px 0;
  color: #64748b;
}
.welcome-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1e293b;
}
.welcome-text {
  font-size: 0.875rem;
}
.message {
  display: flex;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
  max-width: 85%;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.user-message {
  margin-left: auto;
  flex-direction: row-reverse;
}
.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 8px;
  flex-shrink: 0;
}
.user-avatar {
  background: #2563eb;
  color: white;
}
.ai-avatar {
  background: #f1f5f9;
  color: #64748b;
}
.message-bubble {
  flex: 1;
  max-width: calc(100% - 40px);
}
.message-content {
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  font-size: 15px;
  white-space: pre-wrap;
  line-height: 1.5;
  color: #374151;
}
.user-message .message-content {
  background: linear-gradient(to right, #2563eb, #1d4ed8);
  color: white;
}
.assistant-message .message-content {
  background: #f8fafc;
  color: #374151;
}
/* Markdown内容样式 */
.message-content h1, .message-content h2, .message-content h3 {
  color: inherit;
  margin: 8px 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
}
.message-content strong {
  font-weight: 600;
}
.message-content ol, .message-content ul {
  padding-left: 1.25rem;
  margin: 4px 0;
}
.message-content li {
  margin: 2px 0;
}
.message-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}
.message-content td {
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
}
/* 消息附加元素样式 */
.message-image {
  margin-top: 10px;
  max-width: 160px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.message-time {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 4px;
  text-align: right;
}
/* 打字动画 */
.typing-animation {
  min-height: 20px;
  position: relative;
}
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}
.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
/* 输入区域样式 */
.input-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  gap: 16px;
}
h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0;
  color: #1e293b;
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}
/* 图片上传区域样式 */
.image-upload {
  padding: 24px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.image-upload:hover {
  border-color: #2563eb;
  background-color: rgba(37, 99, 235, 0.02);
}
.image-upload p {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
}
.image-preview {
  max-width: 100%;
  max-height: 150px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
/* 文本输入框样式 */
textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  resize: vertical;
  min-height: 100px;
  font-size: 15px;
  line-height: 1.5;
  transition: border-color 0.2s;
}
textarea:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
textarea::placeholder {
  color: #94a3b8;
}
textarea:disabled {
  background: #f8fafc;
  cursor: not-allowed;
}
/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 12px;
}
.send-btn, .ws-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.send-btn {
  background: #2563eb;
  color: white;
}
.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
}
.ws-btn {
  background: #059669;
  color: white;
}
.ws-btn:hover:not(:disabled) {
  background: #047857;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
/* 状态提示样式 */
.status {
  color: #64748b;
  font-size: 14px;
  text-align: center;
  min-height: 20px;
}
/* 响应式布局调整 */
@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
    height: auto;
    gap: 16px;
    padding: 16px;
  }
  .history-container {
    max-height: 50vh;
    padding: 16px;
  }
  .input-container {
    padding: 16px;
  }
  .message {
    max-width: 95%;
  }
  .button-group {
    flex-direction: column;
  }
}
.hidden {
  display: none;
}
</style>