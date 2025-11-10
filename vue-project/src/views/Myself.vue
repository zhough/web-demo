<template>
  <div class="myself-container">
    <div class="hero-section">
      <div class="content-wrapper">
        <h1 class="main-title">个人主页</h1>
        <p class="subtitle">管理您的个人信息和诊断历史</p>
        
        <!-- 个人信息部分 -->
        <section class="section">
          <h2 class="section-title">个人信息</h2>
          <div class="info-card">

              <div class="avatar-wrapper">
                <span class="avatar">👤</span>
              </div>
              <div class="info-details">
                <h3 class="user-name">{{ userInfo.name }}</h3>
                <p class="user-email">{{ userInfo.email }}</p>
                <p class="join-date">加入日期：{{ userInfo.joinDate }}</p>
                <div class="user-id-section">
                  <p class="user-id-label">用户ID：</p>
                  <code class="user-id">{{ userStore.userId }}</code>
                </div>
                <!-- 新增：ID编辑功能 -->
                <div class="edit-id-section">
                  <input 
                    v-model="newUserId" 
                    type="text" 
                    placeholder="输入新用户ID"
                    class="id-input"
                  />

                  <button @click="updateUserId" class="save-id-btn" :disabled="!newUserId.trim()">保存新ID</button>
                </div>
              </div>
              <button class="edit-btn" @click="handleEditProfile">编辑资料</button>
          </div>
        </section>

        <!-- 诊断历史部分 -->
        <section class="section">
          <h2 class="section-title">诊断历史</h2>
          <div v-if="loadingHistory" class="loading">加载历史中...</div>
          <div v-else-if="errorHistory" class="error">错误：{{ errorHistory }} <button @click="fetchDiagnosisHistory">重试</button></div>
          <div v-else-if="diagnosisHistory.length === 0" class="empty-state">
            <p>暂无诊断记录，开始您的第一次诊断吧！</p>
            <button @click="$router.push('/diagnosis')" class="start-btn">开始诊断</button>
          </div>
          <div v-else class="history-grid">
            <div 
              v-for="(item, index) in diagnosisHistory" 
              :key="index"
              class="history-card"
            >
              <div class="history-header">
                <span class="date">{{ item.update_timestamp }}</span>
                <span class="status" :class="item.status">{{ item.type }}</span>
              </div>
              <p class="symptom">{{ item.content }}</p>
              <!-- <p class="diagnosis">{{ item.content }}</p> -->
              <button class="view-btn" @click="handleViewDetail(item)">查看详情</button>
            </div>
            <div 
              v-for="(item, index) in iamges_path" 
              :key="index"
              class="history-card"
            >
              <div class="history-header">
                <p class="diagnosis">{{ item }}</p>
              </div>
            </div>
          </div>
        </section>

        <div class="action-buttons">
          <button @click="$router.push('/')" class="back-btn">返回主页</button>
          <button @click="handleLogout" class="logout-btn">退出登录</button>
        </div>

        <div class="footer-note">
          <p>您的隐私是我们最重视的承诺</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user' // 调整路径到您的stores目录

// Pinia Store：全局userId（响应式共享）
const userStore = useUserStore()
const userId = userStore.userId // 访问全局ID

// 新ID输入（编辑用）
const newUserId = ref('')

// 用户信息（响应式）
const userInfo = ref({
  name: '加载中...',
  email: '加载中...',
  joinDate: '加载中...'
})
const loadingUser = ref(true)
const errorUser = ref('')

// 诊断历史（响应式）
const diagnosisHistory = ref([])
const loadingHistory = ref(true)
const errorHistory = ref('')
const iamges_path = ref([])

// API: 获取诊断历史（使用全局userId）
const fetchDiagnosisHistory = async () => {
  loadingHistory.value = true
  errorHistory.value = ''
  try {
    // API: 获取用户信息（使用全局userId）
    const body = new URLSearchParams();
    body.append('user_id', userStore.userId);
    const response = await fetch('/api/service2/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    //diagnosisHistory.value = data.fact
    diagnosisHistory.value = diagnosisHistory.value
      .concat(data.fact || []) // 加 || [] 防止数据为 undefined 报错
      .concat(data.important || [])
      .concat(data.diagnosis || [])
    iamges_path.value = data.path;
    console.log('FastAPI响应 - 诊断历史:', data)
    
  } catch (error) {
    errorHistory.value = error.message
    console.error('API失败 - 诊断历史:', error)
    diagnosisHistory.value = []
  } finally {
    loadingHistory.value = false
  }
}

// 新增：更新全局userId
const updateUserId = () => {
  if (newUserId.value.trim()) {
    userStore.setUserId(newUserId.value.trim()) // 更新Store（全局生效）
    newUserId.value = '' // 清空输入
    console.log('用户ID已更新为:', userStore.userId)
    // 可选：刷新数据
    //fetchUserInfo()
    fetchDiagnosisHistory()
  }
}

// 页面加载时调用API
onMounted(() => {
  console.log('Myself页面加载，当前userId:', userStore.userId)
  //fetchUserInfo()
  fetchDiagnosisHistory()
  userInfo.value.name = userId
})

// 处理函数
const handleEditProfile = () => {
  console.log('编辑资料，userId:', userStore.userId)
}

const handleViewDetail = (item) => {
  console.log('查看详情:', item)
}

const handleLogout = () => {
  console.log('退出登录，清除userId')
  localStorage.removeItem('token')
  userStore.setUserId(null)
}
</script>



<style scoped>
.myself-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.hero-section {
  width: 100%;
  max-width: 1200px;
  text-align: center;
  animation: fadeInUp 0.8s ease-out;
}

.content-wrapper {
  padding: 40px 20px;
}

.main-title {
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 10px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  animation: slideInDown 0.6s ease-out;
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 50px;
  animation: slideInUp 0.6s ease-out 0.2s both;
}

.section {
  margin-bottom: 60px;
  animation: fadeInUp 0.6s ease-out both;
}

.section:nth-child(2) { animation-delay: 0.3s; }
.section:nth-child(3) { animation-delay: 0.6s; }

.section-title {
  font-size: 2rem;
  font-weight: 600;
  color: white;
  margin-bottom: 30px;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
}

/* 个人信息卡片 */
.info-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: cardSlideIn 0.6s ease-out;
  max-width: 600px;
  margin: 0 auto;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar {
  font-size: 4rem;
  display: block;
}

.info-details {
  flex: 1;
  text-align: left;
}

.user-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin-bottom: 5px;
}

.user-email, .join-date {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 5px;
}

.user-id-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.user-id-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.user-id {
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  color: #fff;
  font-size: 0.9rem;
}

/* 新增：ID编辑部分 */
.edit-id-section {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.id-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
  max-width: 200px;
}

.id-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.save-id-btn {
  background: rgba(33, 150, 243, 0.8);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.save-id-btn:hover:not(:disabled) {
  background: #2196F3;
  transform: translateY(-1px);
}

.save-id-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-btn {
  background: rgba(76, 175, 80, 0.8);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.edit-btn:hover {
  background: #4CAF50;
  transform: translateY(-2px);
}

/* 诊断历史网格 */
.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.history-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  animation: cardSlideIn 0.6s ease-out both;
}

.history-card:nth-child(1) { animation-delay: 0.4s; }
.history-card:nth-child(2) { animation-delay: 0.5s; }

.history-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.date {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status.completed {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.symptom {
  font-size: 1rem;
  color: white;
  margin-bottom: 5px;
  font-weight: 500;
}

.diagnosis {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 15px;
  line-height: 1.4;
}

.view-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  width: 100%;
}

.view-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.5);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.7);
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.start-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.start-btn:hover {
  background: #45a049;
  transform: translateY(-2px);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.back-btn, .logout-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.logout-btn {
  background: rgba(244, 67, 54, 0.8);
  color: white;
  border: 1px solid rgba(244, 67, 54, 0.5);
}

.logout-btn:hover {
  background: #f44336;
}

.footer-note {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out 1s both;
}

.footer-note p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  font-style: italic;
}

/* 加载/错误样式 */
.loading, .error {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.7);
}

.error {
  color: #ff6b6b;
}

.error button {
  margin-left: 10px;
  padding: 5px 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 动画关键帧 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .info-card {
    flex-direction: column;
    text-align: center;
  }

  .info-details {
    text-align: center;
  }

  .user-id-section {
    justify-content: center;
  }

  .edit-id-section {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .id-input {
    max-width: 100%;
  }

  .history-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 20px 10px;
  }

  .main-title {
    font-size: 1.8rem;
  }

  .section-title {
    font-size: 1.5rem;
  }
}
</style>