const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const file = 'file://' + path.join(__dirname, 'winter.html');
  for (const [v, name] of [['girls', 'الدوام-الشتوي-مدارس-الرواد-للبنات']]) {
    await page.goto(`${file}?v=${v}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(__dirname, `${name}.png`) });
  }
  await browser.close();
})();
