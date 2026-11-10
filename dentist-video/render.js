// Render frames with headless Chromium.  node render.js <stageDir> <outDir> [start end | --times t1,t2,...] [--worker i/n]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [stage, out] = process.argv.slice(2, 4);
const args = process.argv.slice(4);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
fs.mkdirSync(out, { recursive: true });
(async () => {
  const server = http.createServer((req, res) => {
    const f = path.join(stage, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
  }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE', m.type(), m.text()); });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(`http://localhost:${port}/index.html${process.env.QUERY || ''}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const dur = await page.evaluate('window.TL_DURATION');
  const stageEl = await page.$('#stage');
  let times = [];
  const ti = args.indexOf('--times');
  if (ti >= 0) times = args[ti + 1].split(',').map(Number).map((t, i) => [t, `t_${String(t).replace('.', '_')}`]);
  else {
    const fps = 24; const n = Math.ceil(dur * fps);
    let [w, nw] = (args[args.indexOf('--worker') + 1] || '0/1').split('/').map(Number);
    for (let f = w; f < n; f += nw) times.push([f / fps, `f_${String(f).padStart(5, '0')}`]);
  }
  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const [t, name] = times[i];
    if (fs.existsSync(path.join(out, name + '.jpg'))) continue;
    await page.evaluate(t => window.renderAt(t), t);
    await stageEl.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 92 });
    if (i % 100 === 0) console.log(name, ((Date.now() - t0) / (i + 1)).toFixed(0), 'ms/frame');
  }
  await browser.close(); server.close();
})();
