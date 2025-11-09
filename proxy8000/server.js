const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const httpProxy = require('http-proxy');
const app = express();
const server = app.listen(8000, '0.0.0.0'); // 【新增】用 server 监听，便于 WS 升级
const proxy = httpProxy.createProxyServer({}); // 底层代理
// 【关键】先处理 WS（最高优先级，避免劫持）
server.on('upgrade', (req, socket, head) => {
  console.log('[代理 8000] WS 升级事件收到:', req.url); // 日志所有 WS 请求
  if (req.url.startsWith('/api/ws')) {
    req.url = req.url.replace('/api/ws', '/ws'); // 重写路径
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
    // 其他 WS（如 Vite HMR）转发到 5002
    proxy.ws(req, socket, head, {
      target: 'http://localhost:5002',
      changeOrigin: true
    }, (err) => {
      if (err) console.error('[代理 8000] HMR WS 失败:', err);
      else console.log('[代理 8000] HMR WS 成功');
    });
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
// 可选：/api/service2 → 5001
app.use('/api/service2', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/api/service2': '' }
}));
// 所有其他 HTTP 路径 → Vue 5002（WS 已单独处理）
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5002',
  changeOrigin: true,
  ws: false, // 【关键】WS 已用 server.on('upgrade') 处理
  pathRewrite: (path) => path.includes('@vite') || path.includes('__vite') ? path : path,
  proxyTimeout: 0,
  timeout: 0
}));
server.on('listening', () => {
  //console.log('=== 单一入口 8000 启动（WS server.on('upgrade') 修复） ===');
  console.log('测试 WS: wscat -c ws://localhost:8000/api/ws');
});
