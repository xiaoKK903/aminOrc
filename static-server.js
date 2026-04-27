const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5173;
const PUBLIC_DIR = path.join(__dirname, 'frontend', 'dist');
const API_TARGET = 'http://localhost:3005';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function proxyRequest(req, res) {
  const parsedUrl = url.parse(req.url);
  const targetUrl = url.parse(API_TARGET);
  
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host
    }
  };
  
  console.log(`[Proxy] ${req.method} ${API_TARGET}${parsedUrl.path}`);
  
  const httpModule = targetUrl.protocol === 'https:' ? https : http;
  const proxyReq = httpModule.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      message: '代理请求失败: ' + err.message,
      error: err.code
    }));
  });
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }
  
  req.pipe(proxyReq);
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  const ext = path.extname(filePath);
  
  if (!ext && !fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, urlPath + '.html');
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>文件不存在: ' + req.url + '</p>');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>500 Internal Server Error</h1><p>' + err.message + '</p>');
      }
    } else {
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  
  if (req.url.startsWith('/api/')) {
    proxyRequest(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n================================');
  console.log('静态文件服务器 + API 代理 启动成功！');
  console.log('================================');
  console.log('端口:', PORT);
  console.log('目录:', PUBLIC_DIR);
  console.log('API 代理:', '/api/* -> ' + API_TARGET + '/api/*');
  console.log('\n访问地址:');
  console.log('  - http://localhost:' + PORT);
  console.log('  - http://localhost:' + PORT + '/warehouse.html (仓配调度模块)');
  console.log('  - http://localhost:' + PORT + '/gateway.html');
  console.log('  - http://localhost:' + PORT + '/log-monitor.html');
  console.log('================================\n');
});
