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
              <span class="avatar">🤪</span>
            </div>
            <div class="info-details">
              <h3 class="user-name">{{ userInfo.name }}</h3>
              <p class="user-email">{{ userInfo.email }}</p>
              <p class="join-date">加入日期：{{ userInfo.joinDate }}</p>

              <div class="user-id-section">
                <p class="user-id-label">用户ID：</p>
                <code class="user-id">{{ userStore.userId }}</code>
              </div>

              <!-- 编辑 ID（修复按钮竖排） -->
              <div class="edit-id-section">
                <input
                  v-model="newUserId"
                  type="text"
                  placeholder="输入新用户ID"
                  class="id-input"
                />
                <button
                  @click="updateUserId"
                  class="save-id-btn"
                  :disabled="!newUserId.trim()"
                >
                  保存新ID
                </button>
              </div>
            </div>

            <!-- <button class="edit-btn" @click="handleEditProfile">
              编辑资料
            </button> -->
          </div>
        </section>

        <!-- 诊断历史（仅文字记录） -->
        <section class="section">
          <h2 class="section-title">诊断记录</h2>
          <div v-if="loadingHistory" class="loading">加载中...</div>
          <div v-else-if="errorHistory" class="error">
            错误：{{ errorHistory }}
            <button @click="fetchDiagnosisHistory">重试</button>
          </div>
          <div v-else-if="diagnosisHistory.length === 0" class="empty-state">
            <p>暂无诊断记录</p>
            <button @click="$router.push('/diagnosis')" class="start-btn">
              开始诊断
            </button>
          </div>
          <div v-else class="history-grid">
            <div
              v-for="(item, idx) in diagnosisHistory"
              :key="'record-' + idx"
              class="history-card record-card"
            >
              <div class="history-header">
                <span class="date">{{ item.update_timestamp }}</span>
                <span class="status" :class="item.status || 'default'">{{ item.type }}</span>
              </div>
              <p class="symptom">{{ item.content }}</p>
              <button class="view-btn" @click="handleViewDetail(item)">
                查看详情
              </button>
            </div>
          </div>
        </section>

        <!-- 图片展示（独立模块） -->
        <section class="section" v-if="imageUrls.length > 0">
          <h2 class="section-title">诊断图片</h2>
          <div class="image-grid">
            <div
              v-for="(image, idx) in imageUrls"
              :key="'img-' + idx"
              class="image-card"
            >
              <div class="image-wrapper">
                <img
                  :src="image"
                  alt="诊断图片"
                  class="diag-image"
                  @error="onImgError(idx)"
                  @click="openLightbox(image)"
                />
                <div v-if="imageErrors[idx]" class="img-error">
                  加载失败
                </div>
              </div>
              <p class="image-caption">
                {{ rawImagePaths[idx]?.time || `图片 ${idx + 1}` }}
              </p>
            </div>
          </div>
        </section>

        <!-- 底部操作 -->
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
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 用户信息
const userInfo = ref({
  name: '加载中...',
  email: '加载中...',
  joinDate: '加载中...'
})
const newUserId = ref('')

// 诊断历史
const diagnosisHistory = ref([])
const loadingHistory = ref(true)
const errorHistory = ref('')

// 图片路径
const rawImagePaths = ref([])
const imageUrls = computed(() =>
  rawImagePaths.value.map(item => `/server-images/${item.url}`)
)
const imageErrors = ref([])

// 图片灯箱（可选）
const lightboxUrl = ref('')
const openLightbox = (url) => {
  lightboxUrl.value = url
}

// API
const fetchDiagnosisHistory = async () => {
  loadingHistory.value = true
  errorHistory.value = ''
  diagnosisHistory.value = []
  rawImagePaths.value = []
  imageErrors.value = []

  try {
    const body = new URLSearchParams()
    body.append('user_id', userStore.userId)

    const resp = await fetch('/api/service2/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

    const data = await resp.json()
    console.log('FastAPI 返回:', data)

    // 合并诊断记录
    const facts = data.fact || []
    const important = data.important || []
    const diagnosis = data.diagnosis || []
    diagnosisHistory.value = [...facts, ...important, ...diagnosis]

    // 图片路径
    if (Array.isArray(data.path)) {
      rawImagePaths.value = data.path.map(p => 
        typeof p === 'string' ? { url: p, time: '' } : p
      )
    } else {
      rawImagePaths.value = []
    }

    // 初始化错误标记
    imageErrors.value = new Array(rawImagePaths.value.length).fill(false)
  } catch (e) {
    errorHistory.value = e.message
    console.error(e)
  } finally {
    loadingHistory.value = false
  }
}

// 更新 ID
const updateUserId = () => {
  if (!newUserId.value.trim()) return
  userStore.setUserId(newUserId.value.trim())
  newUserId.value = ''
  fetchDiagnosisHistory()
}

// 其他
const handleEditProfile = () => console.log('编辑资料')
const handleViewDetail = item => console.log('查看详情', item)
const handleLogout = () => {
  localStorage.removeItem('token')
  userStore.setUserId(null)
}
const onImgError = idx => {
  imageErrors.value[idx] = true
}

// 生命周期
onMounted(() => {
  console.log('Myself 加载，userId:', userStore.userId)
  fetchDiagnosisHistory()
  userInfo.value.name = userStore.userId || '未登录'
})
</script>

<style scoped>
/* ────────────────────── 基础 ────────────────────── */
.myself-container {
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
.subtitle   { font-size: 1.2rem; color: rgba(255,255,255,.9); margin-bottom: 50px; animation: slideInUp .6s ease-out .2s both; }

.section { margin-bottom: 60px; animation: fadeInUp .6s ease-out both; }
.section:nth-child(2) { animation-delay: .3s; }
.section-title { font-size: 2rem; font-weight: 600; color: #fff; margin-bottom: 30px; text-shadow: 0 1px 5px rgba(0,0,0,.2); }

/* ────────────────────── 个人信息 ────────────────────── */
.info-card {
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  max-width: 600px;
  margin: 0 auto;
}
.avatar-wrapper .avatar { font-size: 4rem; }
.info-details { flex: 1; text-align: left; }
.user-name   { font-size: 1.5rem; font-weight: 600; color: #fff; margin-bottom: 5px; }
.user-email, .join-date { font-size: 1rem; color: rgba(255,255,255,.8); margin-bottom: 5px; }

.user-id-section { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.user-id-label   { color: rgba(255,255,255,.7); font-size: .9rem; }
.user-id { background: rgba(0,0,0,.2); padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #fff; font-size: .9rem; }

/* 修复：按钮宽度固定，不随输入框拉伸 */
.edit-id-section {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.id-input {
  flex: 1;
  min-width: 160px;
  padding: 8px 12px;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 20px;
  background: rgba(255,255,255,.1);
  color: #fff;
  font-size: .9rem;
}
.id-input::placeholder { color: rgba(255,255,255,.5); }
.save-id-btn {
  white-space: nowrap; /* 防止文字换行 */
  background: rgba(33,150,243,.8);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: .9rem;
  transition: .3s;
}
.save-id-btn:hover:not(:disabled) { background: #2196F3; transform: translateY(-1px); }
.save-id-btn:disabled { opacity: .5; cursor: not-allowed; }

.edit-btn { background: rgba(76,175,80,.8); color: #fff; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-size: 1rem; transition: .3s; }
.edit-btn:hover { background: #4CAF50; transform: translateY(-2px); }

/* ────────────────────── 诊断记录（纯文字） ────────────────────── */
.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
.record-card {
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: 0 4px 20px rgba(0,0,0,.1);
  transition: .3s;
}
.record-card:hover { transform: translateY(-5px); background: rgba(255,255,255,.15); }

.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.date { font-size: .9rem; color: rgba(255,255,255,.7); }
.status { padding: 4px 8px; border-radius: 12px; font-size: .8rem; font-weight: 500; }
.status.completed { background: rgba(76,175,80,.2); color: #4CAF50; }
.status.default { background: rgba(255,255,255,.2); color: #fff; }

.symptom { font-size: 1rem; color: #fff; margin-bottom: 12px; font-weight: 500; line-height: 1.4; }
.view-btn {
  background: transparent; color: rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.3);
  padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: .85rem; transition: .3s; width: 100%;
}
.view-btn:hover { background: rgba(255,255,255,.1); color: #fff; border-color: rgba(255,255,255,.5); }

/* ────────────────────── 图片模块（独立网格） ────────────────────── */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.image-card {
  background: rgba(255,255,255,.1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  transition: .3s;
}
.image-card:hover { transform: translateY(-4px); }
.image-wrapper {
  position: relative;
  padding-top: 50%; /* 4:3 比例 */
  background: #000;
}
.diag-image {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  cursor: zoom-in;
}
.img-error {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.6); color: #ff6b6b; font-size: .9rem;
}
.image-caption {
  padding: 8px 12px;
  color: rgba(255,255,255,.8);
  font-size: .85rem;
  text-align: center;
  background: rgba(0,0,0,.3);
}

/* ────────────────────── 其他 ────────────────────── */
.empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,.7); }
.empty-state p { margin-bottom: 20px; font-size: 1.1rem; }
.start-btn { background: #4CAF50; color: #fff; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-size: 1rem; transition: .3s; }
.start-btn:hover { background: #45a049; transform: translateY(-2px); }

.action-buttons { display: flex; gap: 20px; justify-content: center; margin: 40px 0 20px; flex-wrap: wrap; }
.back-btn, .logout-btn { padding: 12px 24px; border: none; border-radius: 25px; cursor: pointer; font-size: 1rem; transition: .3s; }
.back-btn { background: rgba(255,255,255,.2); color: #fff; border: 1px solid rgba(255,255,255,.3); }
.back-btn:hover { background: rgba(255,255,255,.3); }
.logout-btn { background: rgba(244,67,54,.8); color: #fff; }
.logout-btn:hover { background: #f44336; }

.footer-note p { color: rgba(255,255,255,.7); font-size: 1rem; font-style: italic; }

.loading, .error { text-align: center; padding: 20px; color: rgba(255,255,255,.7); }
.error { color: #ff6b6b; }
.error button { margin-left: 10px; padding: 5px 10px; background: #4CAF50; color: #fff; border: none; border-radius: 4px; cursor: pointer; }

/* 动画 */
@keyframes fadeInUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideInDown { from { opacity:0; transform:translateY(-30px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideInUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }

/* 响应式 */
@media (max-width: 768px) {
  .main-title { font-size: 2.2rem; }
  .info-card { flex-direction: column; text-align: center; }
  .info-details { text-align: center; }
  .user-id-section { justify-content: center; }
  .edit-id-section { justify-content: center; }
  .id-input { max-width: 100%; }
  .history-grid, .image-grid { grid-template-columns: 1fr; }
  .action-buttons { flex-direction: column; }
}
</style>