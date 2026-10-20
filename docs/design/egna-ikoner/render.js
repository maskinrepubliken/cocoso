// node render.js <icon> <out-basename>  — renders render.html, trims, and
// writes <out>-1024.png and <out>.webp (320 px on the longest side)
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const [icon = 'sevardhet', out = icon, extra = ''] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(data); });
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1536, height: 1536 } });
  page.on('console', (m) => m.type() === 'error' && console.error(m.text()));
  page.on('pageerror', (e) => console.error(e.message));
  await page.goto(`http://localhost:${port}/render.html?icon=${icon}&size=1536${extra}`);
  await page.waitForFunction(() => window.RENDERED, null, { timeout: 120000 });
  const result = await page.evaluate(() => {
    const src = document.querySelector('canvas');
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const scale = 320 / Math.max(w, h);
    const s = document.createElement('canvas'); s.width = Math.round(w * scale); s.height = Math.round(h * scale);
    const sctx = s.getContext('2d'); sctx.imageSmoothingQuality = 'high'; sctx.drawImage(c, x0, y0, w, h, 0, 0, s.width, s.height);
    return { png: src.toDataURL('image/png'), webp: s.toDataURL('image/webp', 0.9), size: [s.width, s.height] };
  });
  fs.writeFileSync(`${out}-1024.png`, Buffer.from(result.png.split(',')[1], 'base64'));
  fs.writeFileSync(`${out}.webp`, Buffer.from(result.webp.split(',')[1], 'base64'));
  console.log(out, result.size);
  await browser.close(); server.close();
});
