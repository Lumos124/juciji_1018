const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 8443;
const CERT_PEM = process.env.CERT_PEM || path.join(ROOT, 'certs', 'cert.pem');
const KEY_PEM = process.env.KEY_PEM || path.join(ROOT, 'certs', 'key.pem');

// 手机端完成某个节点后，通知桌面端解锁对应二维码节点。
// 仅保存在内存中，服务重启后清空（属于演示/局域网体验的轻量状态）。
// 结构：nodeId -> { time, score }
const completedNodes = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function cacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // 代码类保持 no-cache（改完立刻生效）；素材类可缓存，手机重复玩不必再拉一遍。
  if (['.html', '.js', '.css', '.json'].includes(ext)) return 'no-cache';
  return 'public, max-age=86400';
}

function sendFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const range = req.headers.range;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (!match[1]) {
        const suffix = parseInt(match[2], 10);
        start = Math.max(0, stat.size - suffix);
        end = stat.size - 1;
      }
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start <= end && end < stat.size) {
        res.writeHead(206, {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Cache-Control': cacheControl(filePath),
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl(filePath),
  });
  fs.createReadStream(filePath).pipe(res);
}

// URL 前缀别名：把项目外的目录挂载进来，避免复制素材即可被静态服务。
// 新增别名在此追加：'前缀(含首尾斜杠)' : '绝对路径'
/* ---------------- 局域网地址探测 ----------------
   桌面端用它生成“手机扫得到”的二维码地址；否则二维码里会写 localhost，手机进不去。 */
function isPrivateIp(ip) {
  const a = ip.split('.').map(Number);
  return a[0] === 10 || (a[0] === 172 && a[1] >= 16 && a[1] <= 31) || (a[0] === 192 && a[1] === 168);
}
function isVirtualIface(name) {
  const s = (name || '').toLowerCase();
  return /vmnet|vmware|virtualbox|hyper-?v|vethernet|vswitch|wsl|docker|loopback|tailscale|zerotier|hamachi|tun|tap|bluetooth|蓝牙/.test(s);
}
function isPhysicalIface(name) {
  const s = (name || '').toLowerCase();
  return /wi-?fi|wlan|wireless|无线|以太网|ethernet|lan\b|broadcom|realtek|intel|qualcomm|killer|marvell|atheros|ralink|mediatek/.test(s);
}
function getLanInterfaces() {
  const nets = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const ip = net.address;
      if (!isPrivateIp(ip) || ip.startsWith('169.254')) continue;
      let score = 0;
      if (isPhysicalIface(name)) score += 100;
      if (isVirtualIface(name)) score -= 200;
      list.push({ ip, name, score, virtual: isVirtualIface(name) });
    }
  }
  list.sort((a, b) => b.score - a.score || a.ip.localeCompare(b.ip));
  return list;
}

const ALIASES = {
  '/image/': path.join(ROOT, '..', 'image'),
  '/audio/': path.join(ROOT, '..', 'audio'),
};

const EXACT_ALIASES = {
  '/root/完整视频.mp4': path.join(ROOT, '..', '完整视频.mp4'),
};

function resolveAlias(urlPath) {
  if (Object.prototype.hasOwnProperty.call(EXACT_ALIASES, urlPath)) {
    return EXACT_ALIASES[urlPath];
  }
  for (const prefix of Object.keys(ALIASES)) {
    if (urlPath.startsWith(prefix)) {
      const target = ALIASES[prefix];
      const fp = path.normalize(path.join(target, urlPath.slice(prefix.length)));
      if (fp === target || fp.startsWith(target + path.sep)) return fp;
      return null; // 命中别名但越界 → 拒绝
    }
  }
  return undefined; // 未命中别名
}

function createHandler() {
  return (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const query = new URL(req.url, 'http://localhost').searchParams;

    // 局域网信息：桌面端据此生成手机可访问的二维码
    if (urlPath === '/api/info') {
      const lanInterfaces = getLanInterfaces();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({
        lanHosts: lanInterfaces.map((f) => f.ip),
        lanInterfaces,
        host: lanInterfaces.length ? lanInterfaces[0].ip : null,
        port: PORT,
        protocol: 'http:',
      }));
      return;
    }

    // 手机端体验完成：写入完成状态（含分数），桌面端轮询 /api/state 解锁后续节点。
    if (urlPath === '/api/complete') {
      const node = query.get('node');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (!node) {
        res.writeHead(400);
        res.end(JSON.stringify({ completed: false, error: 'missing node' }));
        return;
      }
      const scoreRaw = query.get('score');
      const score = scoreRaw !== null && scoreRaw !== '' && Number.isFinite(Number(scoreRaw))
        ? Number(scoreRaw)
        : null;
      completedNodes.set(node, { time: Date.now(), score });
      res.writeHead(200);
      res.end(JSON.stringify({ completed: true, node, score }));
      return;
    }

    // 桌面端全量状态：已完成环节 + 各自分数（用于顺序解锁与核对得分）。
    if (urlPath === '/api/state') {
      const completed = {};
      for (const [node, value] of completedNodes.entries()) {
        completed[node] = value;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ completed }));
      return;
    }

    if (urlPath === '/api/completion') {
      const node = query.get('node');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(200);
      res.end(JSON.stringify({ node: node || null, completed: !!node && completedNodes.has(node) }));
      return;
    }

    if (urlPath === '/api/reset') {
      completedNodes.clear();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(200);
      res.end(JSON.stringify({ reset: true }));
      return;
    }

    let filePath = resolveAlias(urlPath);
    if (filePath === null) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (filePath === undefined) {
      filePath = path.normalize(path.join(ROOT, urlPath));
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
    }
    if (filePath === ROOT || filePath === ROOT + path.sep) {
      filePath = path.join(ROOT, 'index.html');
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
          'Content-Length': stat.size,
          'Accept-Ranges': 'bytes',
        });
        res.end();
        return;
      }
      sendFile(req, res, filePath, stat);
    });
  };
}

const handler = createHandler();

http.createServer(handler).listen(PORT, '0.0.0.0', () => {
  console.log(`焗瓷记 HTTP: http://localhost:${PORT}/`);
});

if (fs.existsSync(CERT_PEM) && fs.existsSync(KEY_PEM)) {
  https.createServer({
    cert: fs.readFileSync(CERT_PEM),
    key: fs.readFileSync(KEY_PEM),
  }, handler).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`焗瓷记 HTTPS: https://localhost:${HTTPS_PORT}/`);
  });
} else {
  console.log('未找到证书，HTTPS 未启动');
}
