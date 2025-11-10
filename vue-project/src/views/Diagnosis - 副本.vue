<template>
  <div class="chat-container">
    <div class="hero-section">
      <div class="content-wrapper">

        <!-- 标题 -->
        <h1 class="main-title">皮肤诊断助手</h1>
        <p class="subtitle">上传照片或描述症状，实时获取 AI 诊断</p>

        <!-- 聊天主体 -->
        <section class="chat-section">
          <!-- 历史消息 -->
          <div class="history-container" ref="chatContainer">
            <!-- 欢迎消息 -->
            <div v-if="messages.length === 0" class="welcome-card">
              <h3 class="welcome-title">欢迎使用皮肤诊断助手</h3>
              <p class="welcome-text">上传照片或描述您的症状，开始 AI 实时诊断</p>
            </div>

            <!-- 历史消息 -->
            <div
              v-for="(message, index) in messages"
              :key="index"
              :class="['message-card', message.isUser ? 'user-card' : 'ai-card']"
            >
              <div class="avatar" :class="message.isUser ? 'user-avatar' : 'ai-avatar'">
                {{ message.isUser ? 'U' : 'AI' }}
              </div>
              <div class="bubble">
                <div class="content" v-html="message.content"></div>
                <img
                  v-if="message.imageUrl"
                  class="msg-image"
                  :src="message.imageUrl"
                  alt="上传图片"
                />
                <div class="time">{{ message.time }}</div>
              </div>
            </div>

            <!-- 流式 AI 消息 -->
            <div v-if="streamActive" class="message-card ai-card">
              <div class="avatar ai-avatar">AI</div>
              <div class="bubble">
                <div ref="aiBubble" class="content typing" v-html="formattedStreamContent"></div>
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <div class="time">正在生成...</div>
              </div>
            </div>
          </div>

          <!-- 输入区 -->
          <div class="input-card">
            <!-- 图片上传 -->
            <div
              class="upload-area"
              @click="triggerFileInput"
              @dragover.prevent="handleDragOver"
              @dragleave="handleDragLeave"
              @drop.prevent="handleDrop"
              :style="{ borderColor: isDragging ? '#4facfe' : 'rgba(255,255,255,.3)' }"
            >
              <p v-if="!imagePreview">点击或拖拽图片上传（JPG/PNG）</p>
              <img v-if="imagePreview" class="preview-img" :src="imagePreview" alt="预览" />
              <input
                type="file"
                ref="fileInput"
                accept="image/*"
                class="hidden-input"
                @change="handleImage"
              />
            </div>

            <!-- 文本输入 -->
            <textarea
              v-model="userQuery"
              placeholder="描述您的症状..."
              @keydown="handleKeyDown"
              :disabled="streamActive"
              class="query-input"
            ></textarea>

            <!-- 按钮组 -->
            <div class="btn-group">
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
                WS (目前格式化输出有问题不建议用)
              </button>
            </div>

            <!-- 状态栏 -->
            <div class="status-bar">
              <div class="status">{{ streamActive ? 'AI 正在响应...' : '就绪' }}</div>
              <div class="status">ID: {{ userStore.userId }}</div>
              <div class="status tip">测试阶段无登录，初次使用请在主页输入ID</div>
            </div>
          </div>
        </section>

      </div>
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
const messages = ref([])
const chatContainer = ref(null)
const aiBubble = ref(null)
const formattedStreamContent = ref('')
const fileInput = ref(null)
const isDragging = ref(false)

let ws = null

// === 图片处理 ===
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
const triggerFileInput = () => fileInput.value?.click()
const handleDragOver = () => { isDragging.value = true }
const handleDragLeave = () => { isDragging.value = false }
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

// === 滚动到底 ===
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// === 添加消息（紧凑 Markdown 处理）===
const addMessage = (content, isUser = false, imageUrl = '') => {
  let txt = content
    .trim()
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+|\n+$/g, '')
    .replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1')
    .replace(/(\d+\.\s+.*?\n)\n+/g, '$1')

  let html = marked.parse(txt)
  html = html
    .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
    .replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>')
    .replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
    .replace(/<p>(.*?)<\/p>/gi, '$1<br>')

  messages.value.push({
    content: DOMPurify.sanitize(html),
    isUser,
    imageUrl,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })
  scrollToBottom()
}

// === SSE 流式 ===
const startSSE = async () => {
  if (streamActive.value || !userQuery.value.trim()) return
  streamActive.value = true
  formattedStreamContent.value = ''
  const img = imagePreview.value
  const txt = imageBase64.value ? `<image>${userQuery.value}` : userQuery.value
  addMessage(txt, true, img)

  try {
    const resp = await fetch('/api/service1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_query: txt,
        ID: userStore.userId,
        image_base64: imageBase64.value
      })
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      full += chunk

      // 实时格式化（同 addMessage 逻辑）
      const pre = full.trim()
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n{2,}/g, '\n')
        .replace(/^\n+|\n+$/g, '')
        .replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1')
        .replace(/(\d+\.\s+.*?\n)\n+/g, '$1')
      let html = marked.parse(pre)
      html = html
        .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
        .replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>')
        .replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>')
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
        .replace(/<p>(.*?)<\/p>/gi, '$1<br>')
      formattedStreamContent.value = DOMPurify.sanitize(html)

      scrollToBottom()
      await new Promise(r => setTimeout(r, 50))
    }

    if (full) addMessage(full, false)
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

// === WebSocket 流式 ===
const startWebSocket = () => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
  if (ws && ws.readyState === WebSocket.CLOSED) ws = null
  if (!userQuery.value.trim()) return

  streamActive.value = true
  formattedStreamContent.value = ''
  addMessage(userQuery.value, true, imagePreview.value)

  ws = new WebSocket(`ws://${location.host}/api/ws`)
  ws.onopen = () => {
    ws.send(JSON.stringify({
      user_query: userQuery.value,
      ID: 'vue-test',
      image_base64: imageBase64.value
    }))
  }
  ws.onmessage = (e) => {
    const chunk = e.data
    const acc = (formattedStreamContent.value + chunk)
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/^\n+|\n+$/g, '')
      .replace(/([#]{1,6}\s+.*?\n)\n+/g, '$1')
      .replace(/(\d+\.\s+.*?\n)\n+/g, '$1')
    let html = marked.parse(acc)
    html = html
      .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>')
      .replace(/<\/(h[1-6])>\s*<br\s*\/?>/gi, '</$1>')
      .replace(/<\/(ul|ol)>\s*<br\s*\/?>/gi, '</$1>')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
      .replace(/<p>(.*?)<\/p>/gi, '$1<br>')
    formattedStreamContent.value = DOMPurify.sanitize(html)
    scrollToBottom()
  }
  ws.onerror = () => {
    addMessage('WebSocket 失败', false)
    streamActive.value = false
  }
  ws.onclose = () => {
    if (formattedStreamContent.value) addMessage(formattedStreamContent.value, false)
    streamActive.value = false
    ws = null
    userQuery.value = ''
    imageBase64.value = null
    imagePreview.value = ''
    scrollToBottom()
  }
}

onUnmounted(() => ws?.close())
</script>

<style scoped>
/* ────────────────────── 基础 ────────────────────── */
.chat-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.hero-section { width: 100%; max-width: 1200px; text-align: center; }
.content-wrapper { padding: 40px 20px; }

.main-title { font-size: 3rem; font-weight: 700; color: #fff; margin-bottom: 10px; text-shadow: 0 2px 10px rgba(0,0,0,.3); animation: slideInDown .6s ease-out; }
.subtitle   { font-size: 1.2rem; color: rgba(255,255,255,.9); margin-bottom: 40px; animation: slideInUp .6s ease-out .2s both; }

/* ────────────────────── 聊天区域 ────────────────────── */
.chat-section { animation: fadeInUp .6s ease-out both; animation-delay: .3s; }

.history-container {
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 24px;
  max-height: 65vh;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.history-container::-webkit-scrollbar { width: 6px; }
.history-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,.3); border-radius: 3px; }

/* 欢迎卡片 */
.welcome-card {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255,255,255,.8);
}
.welcome-title { font-size: 1.5rem; margin-bottom: 8px; }
.welcome-text  { font-size: 1rem; }

/* 消息卡片 */
.message-card {
  display: flex;
  gap: 12px;
  animation: fadeIn .3s ease-out;
  max-width: 85%;
}
.user-card { margin-left: auto; flex-direction: row-reverse; }
.ai-card   { margin-right: auto; }

.avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: .9rem; flex-shrink: 0;
}
.user-avatar { background: #4facfe; color: #fff; }
.ai-avatar   { background: rgba(255,255,255,.2); color: #fff; }

.bubble {
  flex: 1;
  background: rgba(255,255,255,.15);
  border-radius: 18px;
  padding: 12px 16px;
  border: 1px solid rgba(255,255,255,.2);
  backdrop-filter: blur(6px);
}
.user-card .bubble { background: rgba(79,172,254,.3); }

.content {
  color: #fff;
  font-size: .95rem;
  line-height: 1.2;
  white-space: pre-wrap;
  text-align: left !important;
}
.content * { margin:0 !important; padding:0 !important; line-height:1.2 !important; }
.content h1,.content h2,.content h3,.content h4,.content h5,.content h6 { font-weight:600; }
.content h1 { font-size:1.1rem; }
.content h2 { font-size:1.05rem; }
.content h3,.content h4 { font-size:1rem; }
.content h5,.content h6 { font-size:.95rem; }
.content ul,.content ol { padding-left:1.2rem; margin:0 !important; }
.content li { margin:0 0 .15rem 0 !important; }
.content br { display:inline; }

.msg-image {
  margin-top: 10px;
  max-width: 160px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.3);
}
.time {
  font-size: .75rem;
  color: rgba(255,255,255,.6);
  margin-top: 6px;
  text-align: right;
}

/* 打字动画 */
.typing { min-height:20px; }
.typing-indicator {
  display: flex; gap: 4px; margin-top: 8px; align-items: center;
}
.typing-indicator span {
  width:6px; height:6px; border-radius:50%;
  background: rgba(255,255,255,.6);
  animation: typing 1.4s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) { animation-delay:.2s; }
.typing-indicator span:nth-child(3) { animation-delay:.4s; }
@keyframes typing { 0%,80%,100% {transform:scale(0);opacity:.5;} 40% {transform:scale(1);opacity:1;} }

/* ────────────────────── 输入卡片 ────────────────────── */
.input-card {
  margin-top: 24px;
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 上传区 */
.upload-area {
  padding: 20px;
  border: 2px dashed rgba(255,255,255,.3);
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: .2s;
  position: relative;
}
.upload-area:hover { border-color: #4facfe; background: rgba(255,255,255,.05); }
.upload-area p { color: rgba(255,255,255,.8); font-size: .95rem; margin:0; }
.preview-img {
  max-width: 100%; max-height: 120px;
  border-radius: 8px; margin-top: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.hidden-input { display:none; }

/* 输入框 */
.query-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 16px;
  background: rgba(255,255,255,.1);
  color: #fff;
  font-size: .95rem;
  resize: vertical;
  min-height: 80px;
  transition: .2s;
}
.query-input::placeholder { color: rgba(255,255,255,.6); }
.query-input:focus {
  outline:none; border-color:#4facfe;
  box-shadow:0 0 0 3px rgba(79,172,254,.2);
}
.query-input:disabled { opacity:.6; cursor:not-allowed; }

/* 按钮组 */
.btn-group {
  display: flex; gap: 12px;
}
.send-btn, .ws-btn {
  flex:1;
  padding:12px 16px;
  border:none; border-radius:16px;
  font-size:.95rem; font-weight:500;
  cursor:pointer; transition:.3s;
}
.send-btn {
  background: rgba(79,172,254,.9);
  color:#fff;
}
.send-btn:hover:not(:disabled) { background:#4facfe; transform:translateY(-1px); }
.ws-btn {
  background: rgba(34,197,94,.9);
  color:#fff;
}
.ws-btn:hover:not(:disabled) { background:#22c55e; transform:translateY(-1px); }
button:disabled { opacity:.5; cursor:not-allowed; }

/* 状态栏 */
.status-bar {
  display: flex; flex-direction: column; gap: 4px; color: rgba(255,255,255,.7); font-size:.85rem; text-align:center;
}
.status-bar .tip { font-style:italic; }

/* ────────────────────── 动画 ────────────────────── */
@keyframes fadeInUp { from {opacity:0;transform:translateY(30px);} to {opacity:1;transform:translateY(0);} }
@keyframes slideInDown { from {opacity:0;transform:translateY(-30px);} to {opacity:1;transform:translateY(0);} }
@keyframes slideInUp { from {opacity:0;transform:translateY(30px);} to {opacity:1;transform:translateY(0);} }
@keyframes fadeIn { from {opacity:0;transform:translateY(5px);} to {opacity:1;transform:translateY(0);} }

/* ────────────────────── 响应式 ────────────────────── */
@media (max-width: 768px) {
  .main-title { font-size:2.2rem; }
  .history-container { max-height:50vh; padding:16px; }
  .message-card { max-width:95%; }
  .input-card { padding:16px; }
  .btn-group { flex-direction:column; }
}
</style>