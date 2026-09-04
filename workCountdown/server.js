// 简单静态文件服务器 - 用于浏览器模式测试
// 运行: node server.js  然后手机/浏览器访问 http://电脑IP:8765
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const PORT = 8767;

const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'application/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const fp = path.join(root, decodeURIComponent(urlPath));
  const ext = path.extname(fp).toLowerCase();

  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  Region Map Widget - HTTP 服务器');
  console.log('========================================');
  console.log('  本机:   http://localhost:' + PORT);
  console.log('  局域网: http://' + require('os').networkInterfaces().Ethernet?.[0]?.address || '电脑IP' + ':' + PORT);
  console.log('========================================');
});
