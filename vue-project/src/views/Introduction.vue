<template>
  <div class="feature3-container">
    <div class="hero-section">
      <div class="content-wrapper">
        <h1 class="main-title">系统功能介绍 & 开发进度</h1>
        <p class="subtitle">探索我们的AI皮肤诊断系统的核心功能和持续迭代历程</p>
        
        <!-- 功能介绍部分 -->
        <section class="section">
          <h2 class="section-title">核心功能</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="icon-wrapper">
                <span class="icon">🩹</span>
              </div>
              <h3 class="card-title">智能诊断</h3>
              <p class="card-desc">基于深度学习模型，实时分析皮肤照片，提供专业诊断报告和护理建议。</p>
            </div>
            <div class="feature-card">
              <div class="icon-wrapper">
                <span class="icon">📊</span>
              </div>
              <h3 class="card-title">历史追踪</h3>
              <p class="card-desc">记录您的诊断记录，生成趋势图表，帮助监测皮肤健康变化。</p>
            </div>
            <div class="feature-card">
              <div class="icon-wrapper">
                <span class="icon">🛡️</span>
              </div>
              <h3 class="card-title">隐私保护</h3>
              <p class="card-desc">端到端加密，所有数据本地存储，确保您的隐私安全无虞。</p>
            </div>
            <div class="feature-card">
              <div class="icon-wrapper">
                <span class="icon">💬</span>
              </div>
              <h3 class="card-title">AI咨询</h3>
              <p class="card-desc">实时聊天与AI专家互动，解答个性化护肤疑问。</p>
            </div>
          </div>
        </section>

        <!-- 开发进度部分 -->
        <section class="section">
          <h2 class="section-title">开发进度</h2>
          <div class="progress-timeline">
            <div class="timeline-item">
              <div class="timeline-marker completed">
                <span class="icon">✅</span>
              </div>
              <div class="timeline-content">
                <h3 class="timeline-title">v1.0 发布 (2024 Q4)</h3>
                <p class="timeline-desc">基础诊断模块上线，支持图像上传和初步AI分析。</p>
              </div>
            </div>
            <div class="timeline-item">
              <div class="timeline-marker ongoing">
                <span class="icon">🔄</span>
              </div>
              <div class="timeline-content">
                <h3 class="timeline-title">v1.1 开发中 (2025 Q1)</h3>
                <p class="timeline-desc">集成实时聊天和历史追踪功能，优化移动端体验。</p>
              </div>
            </div>
            <div class="timeline-item">
              <div class="timeline-marker upcoming">
                <span class="icon">⏳</span>
              </div>
              <div class="timeline-content">
                <h3 class="timeline-title">v1.2 计划 (2025 Q2)</h3>
                <p class="timeline-desc">添加多语言支持和社区分享模块，扩展到更多皮肤类型诊断。</p>
              </div>
            </div>
            <div class="timeline-item">
              <div class="timeline-marker upcoming">
                <span class="icon">🚀</span>
              </div>
              <div class="timeline-content">
                <h3 class="timeline-title">v2.0 愿景 (2025 Q3+)</h3>
                <p class="timeline-desc">引入AR试用护肤品和与医生协作功能，打造全生态平台。</p>
              </div>
            </div>
          </div>
        </section>

        <div class="footer-note">
          <p>我们致力于持续创新，让皮肤健康触手可及。欢迎反馈建议！</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 可选：添加滚动动画或交互效果
  console.log('功能3页面加载完成')
})
</script>

<style scoped>
.feature3-container {
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

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 25px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: cardSlideIn 0.6s ease-out both;
}

.feature-card:nth-child(1) { animation-delay: 0.4s; }
.feature-card:nth-child(2) { animation-delay: 0.5s; }
.feature-card:nth-child(3) { animation-delay: 0.6s; }
.feature-card:nth-child(4) { animation-delay: 0.7s; }

.feature-card:hover {
  transform: translateY(-5px) scale(1.01);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.icon-wrapper {
  margin-bottom: 15px;
}

.icon {
  font-size: 3.5rem;
  display: block;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
}

.card-desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

/* 时间线样式 */
.progress-timeline {
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.progress-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.3);
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  position: relative;
  animation: cardSlideIn 0.6s ease-out both;
}

.timeline-item:nth-child(1) { animation-delay: 0.4s; }
.timeline-item:nth-child(2) { animation-delay: 0.5s; }
.timeline-item:nth-child(3) { animation-delay: 0.6s; }
.timeline-item:nth-child(4) { animation-delay: 0.7s; }

.timeline-marker {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  flex-shrink: 0;
  z-index: 1;
  font-size: 1.2rem;
  color: white;
}

.timeline-marker.completed {
  background: rgba(76, 175, 80, 0.8);
  border: 2px solid #4CAF50;
}

.timeline-marker.ongoing {
  background: rgba(255, 193, 7, 0.8);
  border: 2px solid #FF9800;
  animation: pulse 2s infinite;
}

.timeline-marker.upcoming {
  background: rgba(158, 158, 158, 0.5);
  border: 2px solid #9E9E9E;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.timeline-content {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.timeline-content:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(10px);
}

.timeline-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  margin-bottom: 5px;
}

.timeline-desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
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

  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .feature-card {
    padding: 20px 15px;
  }

  .icon {
    font-size: 2.5rem;
  }

  .progress-timeline::before {
    left: 10px;
  }

  .timeline-marker {
    width: 30px;
    height: 30px;
    margin-right: 15px;
  }

  .timeline-content {
    padding: 15px;
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