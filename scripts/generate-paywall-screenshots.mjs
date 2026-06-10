import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'paywall-screenshot.html');
const outputDir = '/Users/arielsilva/Documents/PROJETOS/omeubanco-v2/docs';

// Apple iPhone 6.9" screenshot: 1290x2796px
// Device pixel ratio 3 → viewport 430x932
const VIEWPORT = { width: 430, height: 932, deviceScaleFactor: 3 };

const variants = [
  {
    name: 'paywall-familia-mensal',
    period: 'monthly',
    prices: { familia: 'R$ 9,90', familiaPlus: 'R$ 14,90' },
    periods: { familia: '/mes', familiaPlus: '/mes' },
  },
  {
    name: 'paywall-familia-anual',
    period: 'yearly',
    prices: { familia: 'R$ 89,90', familiaPlus: 'R$ 139,90' },
    periods: { familia: '/ano', familiaPlus: '/ano' },
    discounts: { familia: true, familiaPlus: true },
  },
  {
    name: 'paywall-familia-plus-mensal',
    period: 'monthly',
    prices: { familia: 'R$ 9,90', familiaPlus: 'R$ 14,90' },
    periods: { familia: '/mes', familiaPlus: '/mes' },
  },
  {
    name: 'paywall-familia-plus-anual',
    period: 'yearly',
    prices: { familia: 'R$ 89,90', familiaPlus: 'R$ 139,90' },
    periods: { familia: '/ano', familiaPlus: '/ano' },
    discounts: { familia: true, familiaPlus: true },
  },
];

async function generate() {
  const browser = await puppeteer.launch({ headless: true });

  for (const variant of variants) {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Wait for fonts
    await page.evaluateHandle('document.fonts.ready');

    // Set prices and periods
    await page.evaluate((v) => {
      document.getElementById('price-familia').textContent = v.prices.familia;
      document.getElementById('price-familia-plus').textContent = v.prices.familiaPlus;
      document.getElementById('period-familia').textContent = v.periods.familia;
      document.getElementById('period-familia-plus').textContent = v.periods.familiaPlus;

      // Toggle buttons
      const btnMonthly = document.getElementById('btn-monthly');
      const btnYearly = document.getElementById('btn-yearly');
      if (v.period === 'yearly') {
        btnYearly.classList.add('active');
        btnMonthly.classList.remove('active');
        document.getElementById('discount-familia').style.display = 'inline-block';
        document.getElementById('discount-familia-plus').style.display = 'inline-block';
      } else {
        btnMonthly.classList.add('active');
        btnYearly.classList.remove('active');
        document.getElementById('discount-familia').style.display = 'none';
        document.getElementById('discount-familia-plus').style.display = 'none';
      }
    }, variant);

    const outputPath = path.join(outputDir, `${variant.name}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`Generated: ${outputPath}`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone! 4 screenshots at 1290x2796px saved to docs/');
}

generate().catch(console.error);
