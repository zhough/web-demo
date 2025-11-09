const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const httpProxy = require('http-proxy');
const path = require('path');

const app = express();
const server = app.listen(8000, '0.0.0.0');
const proxy = httpProxy.createProxyServer({});

// WS 升级处理（保持不变）
server.on('upgrade', (req, socket, head) => {
  console.log('[代理 8000] WS 升级事件收到:', req.url);
  if (req.url.startsWith('/api/ws')) {
    req.url = req.url.replace('/api/ws', '/ws');
    console.log('[代理 8000] WS 路径重写 → /ws');
   
    proxy.ws(req, socket, head, {
      target: 'ws://localhost:5000',
      changeOrigin: true
    }, (err) => {
      if (err) {
        console.error('[代理 8000] WS 升级失败:', err);
        socket.destroy();
      } else {
        console.log('[代理 8000] WS 升级成功 → Python 5000');
      }
    });
  } else {
    console.log('[代理 8000] 忽略非 /api/ws 的 WS 请求（生产模式）');
    socket.destroy();  // 关闭非业务 WS
  }
});

// API + SSE：/api/service1 → Python 5000（保持不变）
app.use('/api/service1', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: { '^/api/service1': '' },
  onProxyReq: (proxyReq) => proxyReq.setHeader('Connection', 'keep-alive'),
  onProxyRes: (proxyRes) => {
    if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
      proxyRes.headers['cache-control'] = 'no-cache';
      proxyRes.headers['connection'] = 'keep-alive';
    }
  },
  proxyTimeout: 300000,
  timeout: 300000
}));

// 可选 /api/service2（保持注释）
/*
app.use('/api/service2', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/api/service2': '' }
}));
*/

// 生产静态服务（文件优先匹配）
app.use(express.static(path.join(__dirname, '../vue-project/dist')));

// 【修复】SPA 兜底（无路径 app.use，避开 path-to-regexp）
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../vue-project/dist/index.html'));
  } else {
    res.status(404).send('API Not Found');
  }
});

server.on('listening', () => {
  console.log('=== 单一入口 8000 启动 ===');
  console.log('外部访问: http://你的IP:8000/');
  console.log('测试 WS: wscat -c ws://localhost:8000/api/ws');
});