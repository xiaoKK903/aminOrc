const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, 'frontend', 'dist');

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

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  
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
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n================================');
  console.log('静态文件服务器启动成功！');
  console.log('================================');
  console.log('端口:', PORT);
  console.log('目录:', PUBLIC_DIR);
  console.log('\n访问地址:');
  console.log('  - http://localhost:' + PORT);
  console.log('  - http://localhost:' + PORT + '/gateway.html');
  console.log('  - http://localhost:' + PORT + '/log-monitor.html');
  console.log('================================\n');
});
