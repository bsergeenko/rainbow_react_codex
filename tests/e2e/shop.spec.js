import { test, expect } from '@playwright/test';

test('Startseite, echte Assets und responsive Navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rainbow Design bringt');
  await expect(page.locator('.category-tile')).toHaveCount(4);
  await expect(page.locator('.home-design')).toHaveCount(4);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Kinder', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kinder', exact: true })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(10);
  await page.getByRole('button', { name: 'Mädchen', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(7);
  await page.getByRole('button', { name: 'Jungen', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('Echter Gastwarenkorb: Größe, Mengen, Positionspreis und Löschen', async ({ page }) => {
  await page.goto('/produkt/kids-raincoat-girls?farbe=blue');
  await expect(page.locator('.detail-price')).toContainText('ab 25,00');
  await expect(page.getByRole('button', { name: 'Blau', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Größe');
  await page.getByRole('button', { name: '8–12 Jahre', exact: true }).click();
  await expect(page.locator('.detail-price')).toContainText('32,00');
  await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();
  await expect(page.locator('.cart-count')).toHaveText('1');
  await page.getByRole('link', { name: 'Zum Warenkorb', exact: true }).click();
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Menge verringern' })).toBeDisabled();
  await page.getByRole('button', { name: 'Menge erhöhen' }).click();
  await expect(page.locator('.cart-count')).toHaveText('2');
  await expect(page.locator('.cart-item-price')).toContainText('64,00');
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByText('Dein Warenkorb ist leer.')).toBeVisible();
  await expect(page.locator('.cart-count')).toHaveCount(0);
  await page.goto('/kasse');
  await expect(page.getByText('Dein Warenkorb ist leer.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zahlungspflichtig bestellen' })).toHaveCount(0);
});

test('Konfigurator bewahrt das Motiv, erlaubt alle Farben und beginnt beim neuen Einstieg neu', async ({ page }) => {
  await page.goto('/');
  await page.locator('.home-design').first().click();
  await expect(page.locator('.selected-design img')).toHaveAttribute('src', /designe01.jpg/);
  await page.getByRole('button', { name: 'Hund', exact: true }).click();
  await page.getByRole('button', { name: 'Schwarz', exact: true }).click();
  await expect(page.getByText('Für diese Farbe ist kein Vorschaubild vorhanden.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByLabel('Taschendesign').fill('Sterne');
  await page.getByRole('button', { name: 'Motiv ändern' }).click();
  await page.getByRole('button', { name: 'Kinder', exact: true }).click();
  await page.locator('.design-card').first().click();
  await expect(page.locator('.selected-design img')).toHaveAttribute('src', /designs\/kids/);
  await expect(page.getByRole('button', { name: 'Hund', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();
  await expect(page.locator('.cart-count')).toHaveText('1');
  await page.getByRole('link', { name: 'Zum Warenkorb', exact: true }).click();
  await expect(page.locator('.cart-item img')).toHaveAttribute('src', /designs\/kids/);
  await expect(page.locator('.cart-item')).toContainText('Sterne');
  await expect(page.locator('.cart-item')).toContainText('Hunde');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Dein Design', exact: true }).click();
  await expect(page.locator('.design-card')).toHaveCount(113);
  await expect(page.locator('.selected-design')).toHaveCount(0);
  await page.locator('.design-card').first().click();
  await expect(page.getByRole('button', { name: 'Hund', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Kinder', exact: true }).click();
  await page.getByRole('button', { name: 'Jungen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grün', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '8–12 Jahre', exact: true }).click();
  await expect(page.locator('.config-summary')).toContainText('32,00');
  await expect(page.getByLabel('Taschendesign')).toHaveValue('');
});

test('Suche zeigt die passende Farbe; Gäste werden für die Wunschliste zum Login geführt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Suche öffnen' }).click();
  await page.getByLabel('Was suchst du?').fill('FRAUEN blau');
  await expect(page.locator('.search-result')).toHaveCount(3);
  await page.locator('.search-result').first().click();
  await expect(page.getByRole('button', { name: 'Blau', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Zur Wunschliste hinzufügen' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-Mail-Adresse').fill('niemand@example.org');
  await page.getByLabel('Passwort', { exact: false }).fill('ungueltig');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');
  await page.getByRole('link', { name: 'Registrieren', exact: true }).click();
  await page.getByLabel('Vorname').fill('Anna');
  await page.getByLabel('Nachname').fill('Test');
  await page.getByLabel('E-Mail-Adresse').fill('anna@example.org');
  await page.locator('#password').fill('eins');
  await page.locator('#confirmPassword').fill('zwei');
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await expect(page.getByText('Die Passwörter müssen übereinstimmen.')).toBeVisible();
});

test('404, unbekanntes Produkt und verständlicher Verbindungsfehler', async ({ page }) => {
  await page.goto('/nicht-vorhanden');
  await expect(page.locator('.error-number')).toContainText('404');
  await page.goto('/produkt/nicht-vorhanden');
  await expect(page.locator('.error-number')).toContainText('404');
  await page.route('http://localhost:3000/products', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Verbindung');
  await expect(page.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();
});

test('Shopseiten bleiben auf Smartphone und Tablet vollständig im Bildschirm', async ({ page }) => {
  for (const route of ['/kategorie/women', '/produkt/women-raincoat?farbe=blue', '/design', '/design?motiv=adult-design-01', '/kontakt', '/registrieren', '/login', '/warenkorb', '/unbekannt']) {
    await page.goto(route);
    await expect(page.locator('.loading')).toHaveCount(0);
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => {
        const outside = [...document.querySelectorAll('main a, main button, main input, main textarea, main select')].filter(el => { const rect = el.getBoundingClientRect(); return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1); });
        return { overflow: document.documentElement.scrollWidth > innerWidth, outside: outside.map(el => el.outerHTML.slice(0, 120)) };
      }), { message: `${route} bei ${width}px` }).toEqual({ overflow: false, outside: [] });
    }
  }
});
