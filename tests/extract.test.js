import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProduct, fromShopifyJs, decode } from '../api/_lib/extract.js';
import { isPrivateIp, assertPublicUrl } from '../api/_lib/http.js';

test('JSON-LD product with offers array and relative images', () => {
  const html = `<html><head><title>ignored</title>
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite"},{"@type":"Product","name":"Relaxed Fit Tee &amp; Co","brand":{"@type":"Brand","name":"Basics"},"color":"Off-White","image":["/cdn/tee-front.jpg",{"@type":"ImageObject","url":"https://img.shop.co/tee-back.jpg"}],"offers":[{"@type":"Offer","price":"299.00","priceCurrency":"zar"}]}]}</script>
  </head></html>`;
  const p = extractProduct(html, 'https://shop.co.za/p/tee');
  assert.equal(p.name, 'Relaxed Fit Tee & Co');
  assert.equal(p.brand, 'Basics');
  assert.equal(p.price, 299);
  assert.equal(p.currency, 'ZAR');
  assert.equal(p.colour, 'Off-White');
  assert.deepEqual(p.images, ['https://shop.co.za/cdn/tee-front.jpg', 'https://img.shop.co/tee-back.jpg']);
  assert.equal(p.site, 'shop.co.za');
});

test('ProductGroup falls back to its first variant for price', () => {
  const html = `<script type="application/ld+json">[{"@type":"ProductGroup","name":"Cargo Pants","hasVariant":[{"@type":"Product","image":"https://x.com/c.jpg","offers":{"@type":"AggregateOffer","lowPrice":549.5,"priceCurrency":"ZAR"}}]}]</script>`;
  const p = extractProduct(html, 'https://x.com/cargo');
  assert.equal(p.name, 'Cargo Pants');
  assert.equal(p.price, 549.5);
  assert.deepEqual(p.images, ['https://x.com/c.jpg']);
});

test('Open Graph only page', () => {
  const html = `<meta property="og:title" content="Nike Air Max 90 &#8211; White"><meta property="og:image" content="//static.nike.com/am90.png"><meta property="og:site_name" content="Nike"><meta property="product:price:amount" content="2,499.99"><meta property="product:price:currency" content="ZAR">`;
  const p = extractProduct(html, 'https://www.nike.com/za/t/am90');
  assert.equal(p.name, 'Nike Air Max 90 – White');
  assert.equal(p.price, 2499.99);
  assert.deepEqual(p.images, ['https://static.nike.com/am90.png']);
  assert.equal(p.site, 'Nike');
});

test('broken JSON-LD is skipped and title tag used', () => {
  const p = extractProduct('<title>Hoodie | Shop</title><script type="application/ld+json">{nope</script>', 'https://a.com/h');
  assert.equal(p.name, 'Hoodie | Shop');
  assert.deepEqual(p.images, []);
});

test('Shopify .js JSON', () => {
  const p = fromShopifyJs({ title: 'Boxy Tee', vendor: 'Local', price: 45000, images: ['//cdn.shopify.com/a.jpg'] }, 'https://brand.co.za/products/boxy-tee');
  assert.equal(p.price, 450);
  assert.deepEqual(p.images, ['https://cdn.shopify.com/a.jpg']);
});

test('decode entities', () => { assert.equal(decode('Men&#x27;s &quot;Tee&quot;'), 'Men\'s "Tee"'); });

test('private and reserved addresses are refused', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '::127.0.0.1', '64:ff9b::a9fe:a9fe', 'fec0::1', '100::1', '2002:7f00:1::', '::'])
    assert.ok(isPrivateIp(ip), ip);
  for (const ip of ['8.8.8.8', '41.0.0.1', '2606:4700::1111', '::ffff:8.8.8.8', '2a00:1450:4001::200e']) assert.ok(!isPrivateIp(ip), ip);
  for (const u of ['http://localhost/x', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:169.254.169.254]/', 'file:///etc/passwd', 'http://user:pw@shop.com/', 'not a url'])
    await assert.rejects(assertPublicUrl(u), u);
});
