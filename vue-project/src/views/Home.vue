<template>
  <div class="home-container">
    <div class="hero-section">
      <div class="content-wrapper">
        <h1 class="main-title">皮肤病诊断系统</h1>
        <p class="subtitle">专业AI辅助诊断您的皮肤健康</p>
        <div class="features-grid">
          <div class="feature-card" @click="$router.push('/diagnosis')">
            <div class="icon-wrapper">
              <span class="icon">🔍</span>
            </div>
            <h3 class="card-title">皮肤诊断</h3>
            <p class="card-desc">上传照片或描述症状，AI实时分析</p>
          </div>
          <div class="feature-card" @click="$router.push('/myself')">
            <div class="icon-wrapper">
              <span class="icon">👤</span>
            </div>
            <h3 class="card-title">个人主页</h3>
            <p class="card-desc">查看诊断历史和管理个人信息</p>
          </div>
          <div class="feature-card" @click="$router.push('/introduction')">
            <div class="icon-wrapper">
              <span class="icon">⚙️</span>
            </div>
            <h3 class="card-title">说明</h3>
            <p class="card-desc">功能介绍和开发进度</p>
          </div>
        </div>
        <div class="footer-note">
          <p>安全、私密、可靠的皮肤健康守护者</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 主页逻辑（可选加导航守卫或动画钩子）
import { onMounted } from 'vue'

onMounted(() => {
  // 可选：添加页面加载动画或粒子效果
  console.log('首页加载完成')
})
</script>

<style scoped>
.home-container {
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

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: cardSlideIn 0.6s ease-out both;
}

.feature-card:nth-child(1) { animation-delay: 0.3s; }
.feature-card:nth-child(2) { animation-delay: 0.4s; }
.feature-card:nth-child(3) { animation-delay: 0.5s; }

.feature-card:hover {
  transform: translateY(-10px) scale(1.02);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.icon-wrapper {
  margin-bottom: 20px;
}

.icon {
  font-size: 4rem;
  display: block;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin-bottom: 10px;
}

.card-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.footer-note {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out 0.8s both;
}

.footer-note p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  font-style: italic;
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
    transform: translateY(50px) scale(0.9);
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

  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .feature-card {
    padding: 25px 15px;
  }

  .icon {
    font-size: 3rem;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 20px 10px;
  }

  .main-title {
    font-size: 1.8rem;
  }
}
</style>