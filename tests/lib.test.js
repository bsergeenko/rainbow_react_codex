import test from 'node:test';
import assert from 'node:assert/strict';
import { price, priceLabel, searchProducts, flattenDesigns, validate, profileValues } from '../src/lib.js';

const products = [
  { id: 'adult', name: 'Regenmantel', category: 'women', price: 50, imagesByColor: { red: ['/red.jpg'], blue: ['/blue.jpg'], green: [] } },
  { id: 'child', name: 'Regenmantel', category: 'kids', pricesBySize: { '2-3': 25, '4-7': 28, '8-12': 32 }, imagesByColor: { red: ['/child.jpg'] } },
];
test('Kinderpreise berücksichtigen die ausgewählte Größe', () => {
  assert.equal(price(products[1]), 25);
  assert.equal(price(products[1], '8-12'), 32);
  assert.match(priceLabel(products[1]), /^ab /);
  assert.doesNotMatch(priceLabel(products[1], '4-7'), /^ab /);
});
test('Suche kombiniert deutsche Synonyme und Farbe mit passender Bildvariante', () => {
  const result = searchProducts(products, 'FRAUEN blau');
  assert.equal(result.length, 1);
  assert.equal(result[0].color, 'blue');
  assert.equal(result[0].image, '/blue.jpg');
  assert.equal(searchProducts(products, 'Mädchen')[0].product.id, 'child');
  assert.deepEqual(searchProducts(products, 'unbekannt'), []);
  assert.deepEqual(searchProducts(products, ' '), []);
});
test('Motivkatalog behält alle Motive und ihre Kataloggruppe', () => {
  assert.deepEqual(flattenDesigns({ adult: [{ id: 'a' }], kids: [{ id: 'k' }] }), [{ id: 'a', group: 'adult' }, { id: 'k', group: 'kids' }]);
});
test('Formulare prüfen Pflichtfelder, E-Mail und optionale Adressen', () => {
  const fields = [['name', 'Name'], ['email', 'E-Mail-Adresse', 'email'], ['street', 'Straße', 'text', true]];
  assert.equal(Object.keys(validate({ name: ' ', email: 'ungueltig' }, fields)).length, 2);
  assert.deepEqual(validate({ name: 'Anna', email: 'anna@example.org' }, fields), {});
  assert.equal(profileValues({ address: { city: 'Berlin' } }).city, 'Berlin');
  assert.equal(profileValues(null).street, '');
});
