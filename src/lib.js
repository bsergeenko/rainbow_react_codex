export const API = 'http://localhost:3000';
export const asset = path => path ? (path.startsWith('/assets/') ? API + path : path) : undefined;
export async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch(API + path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error('Die Verbindung konnte nicht hergestellt werden. Bitte versuche es erneut.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(data?.message || 'Die Anfrage konnte nicht ausgeführt werden. Bitte versuche es erneut.'); error.status = response.status; throw error; }
  return data;
}
export const categories = { women: 'Damen', men: 'Herren', kids: 'Kinder', dogs: 'Hunde' };
export const subcategories = { girls: 'Mädchen', boys: 'Jungen' };
export const colors = { black: 'Schwarz', red: 'Rot', blue: 'Blau', aquablue: 'Aquablau', turquoise: 'Türkis', pink: 'Rosa', yellow: 'Gelb', plum: 'Pflaume', green: 'Grün', grey: 'Grau', magenta: 'Magenta', beige: 'Beige', brown: 'Braun', orange: 'Orange', silver: 'Silber' };
export const swatches = { black: '#252525', red: '#cf3c3d', blue: '#3c68ba', aquablue: '#66bdd4', turquoise: '#219c9b', pink: '#edb7c3', yellow: '#eac34b', plum: '#76455e', green: '#608366', grey: '#9a9a97', magenta: '#c73b82', beige: '#d4c3a0', brown: '#8a6049', orange: '#df8b43', silver: '#c6cbd0' };
export const statuses = { new: 'Bestätigt', processing: 'In Bearbeitung', shipped: 'Versendet', delivered: 'Zugestellt', cancelled: 'Storniert' };
export const roles = { user: 'Benutzer', admin: 'Administrator', main_admin: 'Hauptadministrator' };
export const sizeLabel = size => ({ '2-3': '2–3 Jahre', '4-7': '4–7 Jahre', '8-12': '8–12 Jahre' })[size] || size;
export const money = value => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
export const price = (product, size) => product?.pricesBySize ? (size ? Number(product.pricesBySize[size]) : Math.min(...Object.values(product.pricesBySize).map(Number))) : Number(product?.price || 0);
export const priceLabel = (product, size) => (product?.pricesBySize && !size ? 'ab ' : '') + money(price(product, size));
export const variants = products => products.flatMap(product => Object.entries(product.imagesByColor || {}).filter(([, images]) => images.length).map(([color, images]) => ({ product, color, image: images[0] })));
export const productUrl = (product, color) => `/produkt/${product.id}?farbe=${encodeURIComponent(color)}`;
export const designLabel = design => design?.name || `Motiv ${design?.id?.split('-').at(-1) || ''}`;
export const flattenDesigns = data => Object.entries(data || {}).flatMap(([group, designs]) => designs.map(design => ({ ...design, group })));
const synonyms = { women: 'Damen Frau Frauen', men: 'Herren Mann Männer', kids: 'Kinder Kind Mädchen Jungen', dogs: 'Hunde Hund' };
export const normalize = text => text.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
export function searchProducts(products, query) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return variants(products).filter(({ product, color }) => words.every(word => normalize(`${product.name} ${synonyms[product.category]} ${colors[color] || color}`).includes(word)));
}
export const profileValues = user => ({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', street: user?.address?.street || '', postalCode: user?.address?.postalCode || '', city: user?.address?.city || '', country: user?.address?.country || '' });
export const customerFields = [ ['firstName', 'Vorname'], ['lastName', 'Nachname'], ['email', 'E-Mail-Adresse', 'email'], ['street', 'Straße und Hausnummer'], ['postalCode', 'Postleitzahl'], ['city', 'Ort'], ['country', 'Land'] ];
export function validate(values, fields) {
  const errors = {};
  for (const field of fields) {
    const [name, label, type, optional] = field;
    if (!optional && !String(values[name] ?? '').trim()) errors[name] = `Bitte ${label} eingeben.`;
    else if (type === 'email' && values[name] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[name])) errors[name] = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  }
  return errors;
}
export const instagram = 'https://www.instagram.com/rainbow.georgiandesign?stkn=dGE4M3drcmIxYndu';
export const facebook = 'https://www.facebook.com/rainbow.georgiandesign';
