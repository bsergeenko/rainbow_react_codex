// Optional manual visual check: npm run dev must be running.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  await mkdir('artifacts', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(15000);
  await page.goto('http://localhost:5173/design?motiv=adult-design-01');
  await page.getByRole('button', { name: 'Damen', exact: true }).click();
  await page.getByRole('button', { name: 'Türkis', exact: true }).click();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.screenshot({ path: 'artifacts/design-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/design-mobile.png', fullPage: true });
} finally {
  await browser.close();
}
