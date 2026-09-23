import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, harmony, silhouette, guessFromText, nameRGB, normItem } from '../src/engine.js';

const it = (id, category, colours, extra) => normItem(Object.assign({ id, name: id, category, sub: category, colours, pattern: 'solid', warmth: 2, formality: 2, styles: ['casual'], fit: 'regular' }, extra));
const mild = { max: 23, min: 13, code: 0, rain: 0 };

test('neutral outfit reads as neutral, one accent reads as a pop', () => {
  const n = harmony({ top: it('t', 'top', ['white']), bottom: it('b', 'bottom', ['denim']), shoes: it('s', 'shoes', ['black']) });
  assert.equal(n.label, 'Neutral palette');
  const p = harmony({ top: it('t', 'top', ['red']), bottom: it('b', 'bottom', ['denim']), shoes: it('s', 'shoes', ['white']) });
  assert.equal(p.label, 'Red pop');
  assert.ok(p.score > n.score);
});

test('accent echoed in shoes scores higher than a lone accent', () => {
  const lone = harmony({ top: it('t', 'top', ['red']), bottom: it('b', 'bottom', ['black']), shoes: it('s', 'shoes', ['white']) });
  const echo = harmony({ top: it('t', 'top', ['red']), bottom: it('b', 'bottom', ['black']), shoes: it('s', 'shoes', ['red']) });
  assert.ok(echo.score > lone.score);
  assert.ok(echo.echo);
});

test('clashing accents are penalised, analogous ones rewarded', () => {
  const clash = harmony({ top: it('t', 'top', ['red']), bottom: it('b', 'bottom', ['green']), shoes: it('s', 'shoes', ['black']) });
  assert.equal(clash.label, 'Bold complementary');
  const bad = harmony({ top: it('t', 'top', ['yellow']), bottom: it('b', 'bottom', ['purple']), shoes: it('s', 'shoes', ['pink']) });
  assert.ok(bad.score < 0);
  const ana = harmony({ top: it('t', 'top', ['red']), bottom: it('b', 'bottom', ['black']), layer: it('l', 'layer', ['orange']) });
  assert.equal(ana.label, 'Analogous');
});

test('two patterns clash', () => {
  const h = harmony({ top: it('t', 'top', ['white'], { pattern: 'striped' }), bottom: it('b', 'bottom', ['black'], { pattern: 'check' }) });
  assert.ok(h.patternClash);
});

test('silhouette rewards balance and flags baggy on baggy for work', () => {
  const bal = silhouette({ top: it('t', 'top', ['white'], { fit: 'oversized' }), bottom: it('b', 'bottom', ['black'], { fit: 'slim' }) }, 'Casual');
  const baggy = silhouette({ top: it('t', 'top', ['white'], { fit: 'oversized' }), bottom: it('b', 'bottom', ['black'], { fit: 'oversized' }) }, 'Work');
  assert.ok(bal.score > 0);
  assert.ok(baggy.bad && baggy.score < 0);
});

test('candidates prefer the harmonious combo and respect cold weather', () => {
  const S = { items: [
    it('red', 'top', ['red']), it('green', 'top', ['green']),
    it('shorts', 'bottom', ['denim'], { sub: 'denim shorts' }), it('jeans', 'bottom', ['denim'], { sub: 'jeans' }),
    it('pinkshoe', 'shoes', ['green']), it('redshoe', 'shoes', ['red']),
    it('coat', 'layer', ['black'], { warmth: 4 })
  ], outfits: [], wear: [], fb: { like: {}, skip: {} }, profile: {} };
  const E = createEngine(S);
  const cs = E.candidates({ weather: mild, vibe: 'Casual' });
  assert.ok(cs.length > 0);
  assert.equal(cs[0].items.top, 'red');
  assert.equal(cs[0].items.shoes, 'redshoe');
  const cold = E.candidates({ weather: { max: 9, min: 3, code: 3, rain: 0 }, vibe: 'Casual' });
  assert.equal(cold[0].items.bottom, 'jeans');
  assert.equal(cold[0].items.layer, 'coat');
  assert.ok(cold[0].reason.length > 10);
});

test('wishlist items only appear when locked or allowed, and compat explains fit', () => {
  const S = { items: [
    it('tee', 'top', ['white']), it('jeans', 'bottom', ['denim']), it('shoe', 'shoes', ['black']),
    it('wish', 'top', ['red'], { owned: false, price: 499 })
  ], outfits: [], wear: [], fb: { like: {}, skip: {} }, profile: {} };
  const E = createEngine(S);
  assert.ok(E.candidates({ weather: mild }).every(c => c.items.top !== 'wish'));
  const c = E.compat('wish', mild);
  assert.ok(c.fits >= 1);
  assert.equal(c.best[0].items.top, 'wish');
  assert.deepEqual(c.best[0].wish, ['wish']);
});

test('beam search stays fast on a big closet', () => {
  const cols = ['black', 'white', 'grey', 'navy', 'red', 'green', 'beige', 'blue'];
  const items = [];
  for (let i = 0; i < 40; i++) items.push(it('t' + i, 'top', [cols[i % 8]]));
  for (let i = 0; i < 25; i++) items.push(it('b' + i, 'bottom', [cols[(i + 3) % 8]]));
  for (let i = 0; i < 15; i++) items.push(it('s' + i, 'shoes', [cols[(i + 5) % 8]]));
  for (let i = 0; i < 10; i++) items.push(it('l' + i, 'layer', [cols[i % 8]]));
  for (let i = 0; i < 10; i++) items.push(it('x' + i, 'extra', [cols[i % 8]]));
  const E = createEngine({ items, outfits: [], wear: [], fb: { like: {}, skip: {} }, profile: {} });
  const t = Date.now(); const cs = E.candidates({ weather: mild }); const ms = Date.now() - t;
  assert.equal(cs.length, 12);
  assert.ok(ms < 1500, 'took ' + ms + 'ms');
  assert.ok(new Set(cs.map(c => c.items.top)).size >= 6, 'suggestions should vary the top');
});

test('rate returns bars and a verdict', () => {
  const S = { items: [it('t', 'top', ['red']), it('b', 'bottom', ['black']), it('s', 'shoes', ['red'])], outfits: [], wear: [], fb: { like: {}, skip: {} }, profile: {} };
  const r = createEngine(S).rate({ top: 't', bottom: 'b', shoes: 's' }, mild);
  assert.ok(r.overall >= 7, 'overall ' + r.overall);
  assert.ok(r.verdict.length > 5);
});

test('guessFromText reads shop titles', () => {
  assert.deepEqual(
    (({ category, sub, colours, fit }) => ({ category, sub, colours, fit }))(guessFromText("Men's Oversized Heavyweight Tee - Off-White")),
    { category: 'top', sub: 't-shirt', colours: ['cream'], fit: 'oversized' });
  assert.equal(guessFromText('Nike Air Force 1 07 Triple White').category, 'shoes');
  assert.equal(guessFromText('Relaxed Straight Jeans Light Wash').colours[0], 'denim');
  assert.equal(guessFromText('Denim Trucker Jacket').category, 'layer');
  assert.equal(guessFromText('Essentials Hoodie Charcoal').colours[0], 'grey');
  assert.equal(guessFromText('Boot Cut Jeans').category, 'bottom');
  assert.equal(guessFromText('Cotton Sweatshirt Olive').category, 'top');
});

test('nameRGB maps common garment colours', () => {
  assert.equal(nameRGB(20, 20, 22), 'black');
  assert.equal(nameRGB(245, 245, 243), 'white');
  assert.equal(nameRGB(200, 30, 40), 'red');
  assert.equal(nameRGB(40, 50, 90), 'navy');
  assert.equal(nameRGB(80, 110, 160), 'denim');
  assert.equal(nameRGB(215, 195, 170), 'beige');
  assert.equal(nameRGB(110, 115, 70), 'olive');
  assert.equal(nameRGB(150, 150, 152), 'grey');
});
