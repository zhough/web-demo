// 
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const httpProxy = require('http-proxy');
const path = require('path');  // 移到顶部

const app = express();
const server = app.listen(8000, '0.0.0.0');  // 用 server 监听，便于 WS 升级
const proxy = httpProxy.createProxyServer({});  // 底层代理

// 【关键】先处理 WS（最高优先级，避免劫持）
server.on('upgrade', (req, socket, head) => {
  console.log('[代理 8000] WS 升级事件收到:', req.url);  // 日志所有 WS 请求
  if (req.url.startsWith('/api/ws')) {
    req.url = req.url.replace('/api/ws', '/ws');  // 重写路径
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
    // 生产模式下不需要 Vite HMR，注释掉或删除
    // proxy.ws(req, socket, head, {
    //   target: 'http://localhost:5002',
    //   changeOrigin: true
    // }, (err) => {
    //   if (err) console.error('[代理 8000] HMR WS 失败:', err);
    //   else console.log('[代理 8000] HMR WS 成功');
    // });
    console.log('[代理 8000] 忽略非 /api/ws 的 WS 请求（生产模式）');
    socket.destroy();  // 直接关闭非业务 WS
  }
});

// API + SSE：/api/service1 → Python 5000
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

// 可选：/api/service2 → 5001（保持注释）
/*
app.use('/api/service2', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/api/service2': '' }
}));
*/

// 【优化】生产静态服务（在兜底前）
app.use(express.static(path.join(__dirname, '../vue-project/dist')));  // 服务 dist

// 【修复】SPA 路由兜底（用 /* 语法，避免 PathError）
app.get('/*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../vue-project/dist/index.html'));
  } else {
    res.status(404).send('API Not Found');
  }
});

server.on('listening', () => {
  console.log('=== 单一入口 8000 启动（生产静态 + WS） ===');
  console.log('外部访问: http://你的IP:8000/');
  console.log('测试 WS: wscat -c ws://localhost:8000/api/ws');
});