import { test, expect } from '@playwright/test';

async function mockApi(page, request, { role = 'user', loggedIn = true, withCart = false } = {}) {
  const products = await (await request.get('http://localhost:3000/products')).json();
  const designs = await (await request.get('http://localhost:3000/designs')).json();
  const shipping = await (await request.get('http://localhost:3000/shipping-options')).json();
  const me = { id: 'test-user', firstName: 'Anna', lastName: 'Beispiel', email: 'anna@example.org', role, address: { street: 'Musterstraße 1', postalCode: '10115', city: 'Berlin', country: 'Deutschland' } };
  const product = products.find(p => p.category === 'women' && p.customizable);
  const item = { itemId: 'test-cart', productId: product.id, color: 'blue', size: 'M', quantity: 2, designId: designs.adult[0].id, pocketRequest: 'Sterne' };
  const state = { me, loggedIn, products, designs, cart: withCart ? [item] : [], wishlist: [], calls: [], admins: [{ ...me, id: 'main', role: 'main_admin' }, { ...me, id: role === 'admin' ? me.id : 'other', role: 'admin', firstName: 'Max' }], orders: [{ id: 'order-test', userId: me.id, customer: { firstName: me.firstName, lastName: me.lastName, email: me.email, ...me.address }, shippingMethod: shipping[0].id, shippingCost: shipping[0].price, paymentMethod: 'card', items: [{ ...item, unitPrice: product.price, itemTotal: product.price * 2 }], subtotal: product.price * 2, total: product.price * 2 + shipping[0].price, status: 'processing', createdAt: '2026-11-16T12:00:00Z' }] };
  if (role === 'main_admin') state.admins[0].id = me.id;
  await page.route('http://localhost:3000/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const method = req.method();
    if (path.startsWith('/assets/')) return route.continue();
    const body = req.postDataJSON(); state.calls.push({ path, method, body });
    let data, status = 200;
    if (method === 'OPTIONS') data = {};
    else if (path === '/products' && method === 'GET') data = state.products;
    else if (path.startsWith('/products/') && method === 'PUT') { const p = state.products.find(p => p.id === path.split('/')[2]); Object.assign(p, body); data = p; }
    else if (path.startsWith('/products/')) data = state.products.find(p => p.id === path.split('/')[2]);
    else if (path === '/designs') data = designs;
    else if (path === '/custom-colors') data = [...new Set(products.filter(p => p.customizable).flatMap(p => p.colors))];
    else if (path === '/shipping-options') data = shipping;
    else if (path === '/me/password') { if (body.currentPassword !== 'korrekt') { status = 400; data = { message: 'Das aktuelle Passwort ist falsch.' }; } else data = { message: 'Passwort geändert.' }; }
    else if (path === '/me') {
      if (method === 'DELETE') { state.loggedIn = false; data = {}; }
      else if (!state.loggedIn) { status = 401; data = { message: 'Nicht eingeloggt.' }; }
      else if (method === 'PUT') { Object.assign(me, { firstName: body.firstName, lastName: body.lastName, email: body.email, address: { street: body.street, postalCode: body.postalCode, city: body.city, country: body.country } }); data = me; }
      else data = me;
    }
    else if (path === '/login') { state.loggedIn = true; data = me; }
    else if (path === '/logout') { state.loggedIn = false; data = {}; }
    else if (path === '/register') data = { id: 'registered' };
    else if (path === '/cart') { if (method === 'POST') state.cart.push({ ...body, itemId: 'new-cart' }); data = state.cart; }
    else if (path === '/wishlist' && method === 'GET') data = state.wishlist;
    else if (path === '/wishlist' && method === 'POST') { state.wishlist.push({ ...body, itemId: 'wish-test', product: products.find(p => p.id === body.productId) }); data = {}; }
    else if (path.startsWith('/wishlist/') && method === 'DELETE') { state.wishlist = []; data = {}; }
    else if (path === '/orders' && method === 'GET') data = state.orders;
    else if (path === '/orders' && method === 'POST') { data = { ...state.orders[0], id: 'order-created', customer: body.customer, userId: state.loggedIn ? me.id : null, shippingMethod: body.shippingMethod, status: 'new' }; state.orders.unshift(data); state.cart = []; }
    else if (path.startsWith('/orders/') && method === 'PUT') { const order = state.orders.find(o => o.id === path.split('/')[2]); order.status = path.endsWith('/cancel') ? 'cancelled' : body.status; data = order; }
    else if (path === '/users') data = [{ ...me, role: 'user' }];
    else if (path === '/admins' && method === 'GET') data = state.admins;
    else if (path === '/admins' && method === 'POST') { state.admins.push({ ...body, id: 'created-admin', role: 'admin' }); data = {}; }
    else if (path.startsWith('/admins/') && method === 'PUT') { Object.assign(state.admins.find(a => a.id === path.split('/')[2]), body); data = {}; }
    else if (path.startsWith('/admins/') && method === 'DELETE') { state.admins = state.admins.filter(a => a.id !== path.split('/')[2]); data = {}; }
    else if (path === '/contact') data = {};
    else { status = 404; data = { message: 'Nicht gefunden.' }; }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' }, body: JSON.stringify(data ?? {}) });
  });
  return state;
}

test('Gastcheckout validiert Karte und versendet ausschließlich die erlaubten Bestelldaten', async ({ page, request }) => {
  const state = await mockApi(page, request, { loggedIn: false, withCart: true });
  await page.goto('/kasse');
  await page.getByRole('button', { name: 'Zahlungspflichtig bestellen' }).click();
  await expect(page.getByText('Bitte eine Kartennummer mit 16 Ziffern eingeben.')).toBeVisible();
  for (const [id, value] of Object.entries({ firstName: 'Mia', lastName: 'Gast', email: 'gast@example.org', street: 'Gartenstraße 2', postalCode: '20095', city: 'Hamburg', country: 'Deutschland', cardNumber: '4242 4242 4242 4242', expiry: '12/29', securityCode: '123' })) await page.locator(`#${id}`).fill(value);
  await page.getByRole('button', { name: 'Zahlungspflichtig bestellen' }).click();
  await expect(page.getByText('Bitte wähle eine Versandart aus.')).toBeVisible();
  await page.getByRole('radio', { name: /Standardversand/ }).check();
  await page.getByRole('button', { name: 'Zahlungspflichtig bestellen' }).click();
  await expect(page.getByRole('heading', { name: 'Vielen Dank für deine Bestellung!' })).toBeVisible();
  await expect(page.locator('.order-details')).toContainText('order-created');
  await expect(page.locator('.order-details')).toContainText('Gartenstraße 2');
  await expect(page.locator('.cart-count')).toHaveCount(0);
  const sent = state.calls.find(call => call.path === '/orders' && call.method === 'POST').body;
  expect(Object.keys(sent).sort()).toEqual(['customer', 'items', 'paymentMethod', 'shippingMethod']);
  expect(sent.paymentMethod).toBe('card');
  expect(JSON.stringify(sent)).not.toContain('4242');
});

test('Konto zeigt Daten zunächst ohne Felder, speichert optionale Adresse und prüft aktuelles Passwort', async ({ page, request }) => {
  const state = await mockApi(page, request);
  await page.goto('/konto');
  await expect(page.getByRole('heading', { name: 'Hallo, Anna.' })).toBeVisible();
  await expect(page.locator('#firstName')).toHaveCount(0);
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await page.locator('#street').fill('');
  await page.locator('#postalCode').fill('');
  await page.locator('#city').fill('');
  await page.locator('#country').fill('');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('#firstName')).toHaveCount(0);
  expect(state.me.address.street).toBe('');
  await page.locator('.account-menu').getByRole('button', { name: 'Passwort ändern' }).click();
  await page.locator('#currentPassword').fill('falsch');
  await page.locator('#newPassword').fill('neuesPasswort');
  await page.locator('#confirmPassword').fill('neuesPasswort');
  await page.locator('form').getByRole('button', { name: 'Passwort ändern' }).click();
  await expect(page.getByRole('alert')).toHaveText('Das aktuelle Passwort ist falsch.');
  await page.locator('#currentPassword').fill('korrekt');
  await page.locator('form').getByRole('button', { name: 'Passwort ändern' }).click();
  await expect(page.getByRole('status')).toContainText('Dein Passwort wurde geändert.');
  const passwordCall = state.calls.filter(call => call.path === '/me/password').at(-1);
  expect(Object.keys(passwordCall.body).sort()).toEqual(['currentPassword', 'newPassword']);
  await page.getByRole('link', { name: 'Meine Wunschliste', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Zurück zum Benutzerkonto', exact: false })).toBeVisible();
});

test('Wunschliste speichert die Farbe und entfernt gespeicherte Produkte', async ({ page, request }) => {
  const state = await mockApi(page, request);
  await page.goto('/produkt/women-raincoat?farbe=blue');
  await page.getByRole('button', { name: 'Zur Wunschliste hinzufügen' }).click();
  await expect(page.getByRole('button', { name: 'Aus Wunschliste entfernen' })).toBeVisible();
  expect(state.wishlist[0].color).toBe('blue');
  await page.getByRole('link', { name: 'Wunschliste', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Blau');
  await page.getByRole('button', { name: 'Aus Wunschliste entfernen' }).click();
  await expect(page.getByText('Deine Wunschliste ist leer.')).toBeVisible();
});

test('Bestellstornierung verlangt Bestätigung und zeigt vollständigen Erstattungsbetrag; Kontolöschung ist bestätigt', async ({ page, request }) => {
  const state = await mockApi(page, request);
  await page.goto('/konto');
  await page.locator('.order-toggle').click();
  await expect(page.locator('.order-details')).toContainText('Sterne');
  await page.getByRole('button', { name: 'Bestellung stornieren', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(state.orders[0].status).toBe('processing');
  await page.getByRole('button', { name: 'Bestellung stornieren', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bestellung stornieren', exact: true }).click();
  await expect(page.locator('.refund-note')).toContainText('104,99');
  await expect(page.locator('.refund-note')).toContainText('einschließlich Versandkosten');
  await expect(page.locator('.order-toggle .status')).toHaveText('Storniert');
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Konto löschen', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Konto löschen', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(state.loggedIn).toBe(false);
});

test('Login aus dem Warenkorb kehrt zurück und Registrierung übermittelt keine Passwortbestätigung', async ({ page, request }) => {
  const state = await mockApi(page, request, { loggedIn: false, withCart: true });
  await page.goto('/warenkorb');
  await page.getByRole('link', { name: 'Registrieren', exact: true }).click();
  for (const [id, value] of Object.entries({ firstName: 'Eva', lastName: 'Test', email: 'eva@example.org', password: 'passwort', confirmPassword: 'passwort' })) await page.locator(`#${id}`).fill(value);
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await expect(page).toHaveURL(/login\?von=warenkorb/);
  expect(state.calls.find(c => c.path === '/register').body).not.toHaveProperty('confirmPassword');
  await expect(page.getByRole('status')).toContainText('Registrierung war erfolgreich');
  await page.locator('#email').fill('eva@example.org');
  await page.locator('#password').fill('passwort');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await expect(page).toHaveURL(/\/warenkorb$/);
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await expect(page.getByText('Registrierung war erfolgreich', { exact: false })).toHaveCount(0);
});

test('Kontakt übernimmt editierbare Kontodaten und leert das Formular nach dem Senden', async ({ page, request }) => {
  const state = await mockApi(page, request);
  await page.goto('/kontakt');
  await expect(page.locator('#name')).toHaveValue('Anna Beispiel');
  await page.locator('#name').fill('Anna Neu');
  await page.locator('#subject').fill('Mein Regenmantel');
  await page.locator('#message').fill('Eine Frage zum Mantel.');
  await page.getByRole('button', { name: 'Nachricht senden' }).click();
  await expect(page.getByRole('status')).toContainText('Vielen Dank für deine Nachricht.');
  await expect(page.locator('#name')).toHaveValue('');
  expect(state.calls.find(c => c.path === '/contact').body.name).toBe('Anna Neu');
});

for (const role of ['main_admin', 'admin']) {
  test(`Adminbereich trennt den Shop und beachtet die Rechte von ${role}`, async ({ page, request }) => {
    const state = await mockApi(page, request, { role, loggedIn: false });
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.org');
    await page.locator('#password').fill('passwort');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/produkte$/);
    await expect(page.locator('.footer')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
    await page.locator('.admin-products .panel').filter({ hasText: 'Mädchen' }).getByRole('button', { name: 'Bearbeiten' }).click();
    await page.locator('#price-2-3').fill('26');
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.locator('.admin-products .panel').filter({ hasText: 'Mädchen' })).toContainText('ab 26,00');
    expect(state.calls.find(c => c.method === 'PUT' && c.path.includes('kids-raincoat-girls')).body.pricesBySize['2-3']).toBe(26);
    await page.getByRole('link', { name: 'Benutzer', exact: true }).click();
    await expect(page.locator('.admin-users')).toContainText('Musterstraße 1');
    await page.locator('.order-toggle').click();
    await expect(page.locator('.order-details')).toContainText('Zugeordnetes Benutzerkonto: test-user');
    await expect(page.getByText('Deine Bestellung', { exact: true })).toHaveCount(0);
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByLabel('Bestellstatus').selectOption('shipped');
    await expect(page.locator('.order-toggle .status')).toHaveText('Versendet');
    await page.getByRole('link', { name: 'Administratoren', exact: true }).click();
    await expect(page.locator('.admin-people .panel').first()).toContainText('Hauptadministrator');
    if (role === 'main_admin') {
      await page.getByRole('button', { name: 'Administrator anlegen', exact: true }).click();
      for (const [id, value] of Object.entries({ firstName: 'Neu', lastName: 'Admin', email: 'neu@example.org', password: 'passwort' })) await page.locator(`#${id}`).fill(value);
      await page.locator('form').getByRole('button', { name: 'Administrator anlegen' }).click();
      await expect(page.locator('.admin-people .panel')).toHaveCount(3);
      await page.locator('.admin-people .panel').filter({ hasText: 'Neu Admin' }).getByRole('button', { name: 'Administrator löschen' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Löschen', exact: true }).click();
      await expect(page.locator('.admin-people .panel')).toHaveCount(2);
    } else {
      await expect(page.getByRole('button', { name: 'Administrator anlegen' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Administrator löschen' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toHaveCount(1);
    }
    await page.goto('/admin/nicht-vorhanden');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    await expect(page.getByRole('link', { name: 'Zur Startseite des Adminbereichs' })).toBeVisible();
    await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  });
}

test('Checkout übernimmt gespeicherte Daten und bietet das Speichern der Adresse an', async ({ page, request }) => {
  const state = await mockApi(page, request, { withCart: true });
  await page.goto('/kasse');
  await expect(page.locator('#street')).toHaveValue('Musterstraße 1');
  await expect(page.locator('#firstName')).toHaveValue('Anna');
  await page.getByLabel('Diese Adresse in meinem Konto speichern').check();
  await page.locator('#street').fill('Neue Straße 5');
  for (const [id, value] of Object.entries({ cardNumber: '4242424242424242', expiry: '12/29', securityCode: '123' })) await page.locator(`#${id}`).fill(value);
  await page.getByRole('radio', { name: /Expressversand/ }).check();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Zahlungspflichtig bestellen' }).click();
  await expect(page).toHaveURL(/bestellbestaetigung$/);
  const sent = state.calls.find(call => call.path === '/orders' && call.method === 'POST').body;
  expect(sent.saveAddress).toBe(true);
  expect(sent.customer.street).toBe('Neue Straße 5');
  expect(sent.shippingMethod).toBe('express');
});

test('API-Fehler bei der Wunschliste sind sichtbar und Hinweise verschwinden beim Seitenwechsel', async ({ page, request }) => {
  await mockApi(page, request);
  await page.route('http://localhost:3000/wishlist', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' }, body: JSON.stringify({ message: 'Speichern fehlgeschlagen. Bitte versuche es erneut.' }) });
  });
  await page.goto('/kategorie/women');
  await page.getByRole('button', { name: 'Zur Wunschliste hinzufügen' }).first().click();
  await expect(page.getByRole('alert')).toContainText('Speichern fehlgeschlagen');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Herren', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
