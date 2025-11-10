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
      <div class="status">当前ID: {{ userStore.userId }}</div>
      <div class="status">测试阶段无登录验证页面，初次使用先在主页输入ID</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const userQuery = ref('')
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

// 新增：统一滚动到底部函数（修复滚动问题）
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 添加消息到历史（格式化，trim尾部换行）
const addMessage = (content, isUser = false, imageUrl = '') => {
  // 强制预处理文本：合并所有多空行（标题/列表间），移除标题前后/列表间多\n
  let preprocessedContent = content
    .trim()
    .replace(/\n{3,}/g, '\n\n') // 3+空行 → 双空行（段落分隔）
    .replace(/\n{2,}/g, '\n') // 进一步：双空行 → 单空行（强制紧凑，移除标题/列表间空行）
    .replace(/^\n+|\n+$/g, '') // 移除首尾\n

  // 额外：针对标题后强制无空行（e.g., "请告诉我：\n\n1." → "请告诉我：1."）
  preprocessedContent = preprocessedContent.replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1') // 标题后\n+ → 无
  preprocessedContent = preprocessedContent.replace(/(\d+\.\s+.*?\n)\n+/g, '$1') // 编号列表后\n+ → 无（列表间紧凑）

  let parsedContent = marked.parse(preprocessedContent)
  // Post-process: 移除多余<br>，标题/列表后<br>，空p，并强制unwrap所有<p>（直接文本，无段落margin）
  parsedContent = parsedContent.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>') // 合并连续<br>
  parsedContent = parsedContent.replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>') // 移除标题后<br>
  parsedContent = parsedContent.replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>') // 移除列表后<br>
  parsedContent = parsedContent.replace(/<p>\s*<\/p>/g, '') // 移除空段落
  parsedContent = parsedContent.replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>') // Unwrap li内p
  // 新增：强制unwrap所有顶级/非li内<p>，转为纯文本（消除所有段落换行/间距）
  parsedContent = parsedContent.replace(/<p>(.*?)<\/p>/gi, '$1<br>') // <p>内容</p> → 内容<br>（保留单br分段，但无margin）
  // 对于列表间/标题后，已由预处理移除额外br

  messages.value.push({
    content: DOMPurify.sanitize(parsedContent),
    isUser,
    imageUrl,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })
  scrollToBottom() // 统一滚动
}

// SSE 流式（保持逻辑）
const startSSE = async () => {
  if (streamActive.value || !userQuery.value.trim()) return
  streamActive.value = true
  formattedStreamContent.value = ''
  const imageUrl = imagePreview.value
  const userContent = imageBase64.value ? `<image>${userQuery.value}` : userQuery.value
  addMessage(userContent, true, imageUrl)

  try {
    const response = await fetch('/api/service1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_query: userContent,
        ID: userStore.userId,
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
            let preprocessed = fullContent
              .trim()
              .replace(/\n{3,}/g, '\n\n')
              .replace(/\n{2,}/g, '\n')
              .replace(/^\n+|\n+$/g, '')
              .replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1')
              .replace(/(\d+\.\s+.*?\n)\n+/g, '$1')

            let parsed = marked.parse(preprocessed)
            parsed = parsed.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
            parsed = parsed.replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>')
            parsed = parsed.replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>')
            parsed = parsed.replace(/<p>\s*<\/p>/g, '')
            parsed = parsed.replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
            parsed = parsed.replace(/<p>(.*?)<\/p>/gi, '$1<br>') // 强制unwrap p
            formattedStreamContent.value = DOMPurify.sanitize(parsed)
          }
        } else if (line.trim() && !line.startsWith(':')) {
          let preprocessed = fullContent
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\n{2,}/g, '\n')
            .replace(/^\n+|\n+$/g, '')
            .replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1')
            .replace(/(\d+\.\s+.*?\n)\n+/g, '$1')

          let parsed = marked.parse(preprocessed)
          parsed = parsed.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
          parsed = parsed.replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>')
          parsed = parsed.replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>')
          parsed = parsed.replace(/<p>\s*<\/p>/g, '')
          parsed = parsed.replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
          parsed = parsed.replace(/<p>(.*?)<\/p>/gi, '$1<br>') // 强制unwrap p
          formattedStreamContent.value = DOMPurify.sanitize(parsed)
        }
      }

      scrollToBottom() // 统一滚动
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
    scrollToBottom()
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
    let newContent = (formattedStreamContent.value + chunk)
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/^\n+|\n+$/g, '')
      .replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1')
      .replace(/(\d+\.\s+.*?\n)\n+/g, '$1') // 预处理累积内容

    let parsed = marked.parse(newContent)
    parsed = parsed.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
    parsed = parsed.replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>')
    parsed = parsed.replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>')
    parsed = parsed.replace(/<p>\s*<\/p>/g, '')
    parsed = parsed.replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
    parsed = parsed.replace(/<p>(.*?)<\/p>/gi, '$1<br>') // 强制unwrap p
    formattedStreamContent.value = DOMPurify.sanitize(parsed)
    scrollToBottom() // 统一滚动
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
    scrollToBottom()
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
  scroll-behavior: auto; /* 新增：即时滚动 */
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
  line-height: 1.1; /* 极致紧凑行高，强制无视觉换行 */
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

/* 核心优化：所有元素零间距，强制紧凑 */
.message-content * {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1.1 !important; /* 统一极致紧凑 */
}
.message-content h1, 
.message-content h2, 
.message-content h3,
.message-content h4,
.message-content h5,
.message-content h6,
.message-content p,
.message-content ol, 
.message-content ul {
  color: inherit;
  margin: 0 !important;
  padding: 0 !important;
  font-size: inherit;
  font-weight: 600;
  line-height: 1.1 !important;
}
/* 标题层级微调，无间距 */
.message-content h1 { font-size: 1.05rem; }
.message-content h2 { font-size: 1rem; }
.message-content h3 { font-size: 0.95rem; }
.message-content h4 { font-size: 0.95rem; font-weight: 600; }
.message-content h5, .message-content h6 { font-size: 0.9rem; }

/* 段落/文本：已unwrap，无需额外 */
.message-content br {
  display: inline; /* 保留单br作为唯一分隔，无多行 */
  line-height: 1.1;
}

/* 列表：极致紧凑，li仅微底距 */
.message-content ol, 
.message-content ul {
  padding-left: 1rem;
  margin: 0 !important;
  line-height: 1.1;
}
.message-content li {
  margin: 0 !important;
  padding: 0 0 0.0625em 0 !important; /* 极小底距（1px） */
  line-height: 1.1;
}
.message-content li > * {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1.1 !important;
}
/* 嵌套列表 */
.message-content ul ul,
.message-content ol ul,
.message-content ul ol,
.message-content ol ol {
  margin: 0 !important;
  padding-left: 1rem;
}

/* 表格紧凑 */
.message-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 !important;
}
.message-content td {
  padding: 1px 4px !important; /* 最小padding */
  border: 1px solid #e2e8f0;
}

/* 最后一个元素绝对无距 */
.message-content :last-child {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
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
  max-height: 120px; /* 缩小预览图高度，更紧凑 */
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
  min-height: 80px; /* 缩小输入框最小高度 */
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