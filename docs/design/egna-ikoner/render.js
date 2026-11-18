// node render.js <icon> <out-basename>  — renders render.html, trims, and
// writes <out>-1024.png and <out>.webp (320 px on the longest side, or the
// size given as a fourth argument); SIZE sets the render's side (1536).
// An icon that reports window.MARKS also gets <out>-marks.json, the marks
// as fractions of the trimmed picture's width.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const [icon = 'sevardhet', out = icon, extra = '', webp = '320'] = process.argv.slice(2);
const SIZE = Number(process.env.SIZE || 1536);
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(data); });
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  page.on('console', (m) => m.type() === 'error' && console.error(m.text()));
  page.on('pageerror', (e) => console.error(e.message));
  await page.goto(`http://localhost:${port}/render.html?icon=${icon}&size=${SIZE}${extra}`);
  await page.waitForFunction(() => window.RENDERED, null, { timeout: 120000 });
  const result = await page.evaluate((longest) => {
    const src = document.querySelector('canvas');
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const scale = longest / Math.max(w, h);
    const s = document.createElement('canvas'); s.width = Math.round(w * scale); s.height = Math.round(h * scale);
    const sctx = s.getContext('2d'); sctx.imageSmoothingQuality = 'high'; sctx.drawImage(c, x0, y0, w, h, 0, 0, s.width, s.height);
    const f = (v) => Math.round(v * 1e4) / 1e4;
    const marks = window.MARKS && window.MARKS.map((m) => ({ ...m, x: f((m.x - x0) / w), y: f((m.y - y0) / w), r: f(m.r / w) }));
    return { marks, aspect: f(w / h), png: src.toDataURL('image/png'), webp: s.toDataURL('image/webp', 0.9), size: [s.width, s.height] };
  }, Number(webp));
  fs.writeFileSync(`${out}-1024.png`, Buffer.from(result.png.split(',')[1], 'base64'));
  fs.writeFileSync(`${out}.webp`, Buffer.from(result.webp.split(',')[1], 'base64'));
  if (result.marks) fs.writeFileSync(`${out}-marks.json`, JSON.stringify({ aspect: result.aspect, marks: result.marks }, null, 1));
  console.log(out, result.size);
  await browser.close(); server.close();
});
