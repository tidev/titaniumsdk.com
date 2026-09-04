import { buildSymbolTable, lookupSymbols, type SymbolPayload } from './symbols.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const payload: SymbolPayload = {
  sdk: '13.4.1',
  t: [
    ['Titanium.UI', ['createWindow', 'backgroundColor']],
    ['Titanium.UI.Window', ['open>open', 'close', 'open>open-event']],
    ['Titanium.Proxy', ['addEventListener']],
    ['Titanium.UI.iOS.PreviewContext.Window', []],
    ['openWindowParams', ['top']],
  ],
  m: [['ti.map', ['Modules.Map', 'Modules.Map.View']]],
};
const table = buildSymbolTable(payload);
const top = (q: string) => lookupSymbols(table, q, 5)[0];

describe('symbol lookup', () => {
  test('an exact qualified name wins outright', () => {
    const hit = top('Titanium.UI.Window');
    assert.equal(hit.title, 'Titanium.UI.Window');
    assert.equal(hit.rule, 'exact');
    assert.equal(hit.url, '/docs/sdk/13.4.1/Titanium.UI.Window');
  });

  test('a bare member name resolves to the symbol, which is what Pagefind cannot do', () => {
    const hit = top('addEventListener');
    assert.equal(hit.title, 'Titanium.Proxy.addEventListener');
    assert.equal(hit.rule, 'segment');
    assert.equal(hit.url, '/docs/sdk/13.4.1/Titanium.Proxy#addEventListener');
  });

  test('a disambiguated member keeps the anchor the page renders', () => {
    const hits = lookupSymbols(table, 'open', 5);
    const urls = hits.filter((h) => h.title === 'Titanium.UI.Window.open').map((h) => h.url);
    assert.ok(urls.includes('/docs/sdk/13.4.1/Titanium.UI.Window#open'));
    assert.ok(
      urls.includes('/docs/sdk/13.4.1/Titanium.UI.Window#open-event'),
      'the event anchor should survive the payload'
    );
  });

  test('the shorter qualified name ranks first', () => {
    assert.equal(top('Window').title, 'Titanium.UI.Window');
  });

  test('typos still land — the reason this exists alongside Pagefind', () => {
    assert.equal(top('creatWindow').title, 'Titanium.UI.createWindow');
    assert.equal(top('creatWindow').rule, 'fuzzy');
    assert.equal(top('addEventLisener').title, 'Titanium.Proxy.addEventListener');
  });

  test('a short name is not fuzzy-matched into something unrelated', () => {
    // Four characters or fewer get no tolerance: at that length almost
    // everything is one edit from everything else.
    assert.equal(lookupSymbols(table, 'oper', 5).length, 0);
  });

  test('tokens must begin segments, not merely occur', () => {
    assert.equal(top('window open').title, 'Titanium.UI.Window.open');
    // `ti` inside `openWindowParams` must not count.
    assert.ok(!lookupSymbols(table, 'ti map', 5).some((h) => h.title === 'openWindowParams'));
  });

  test('a module id is a symbol in its own right', () => {
    const hit = top('ti.map');
    assert.equal(hit.title, 'ti.map');
    assert.equal(hit.url, '/modules/ti.map');
    assert.equal(hit.kind, 'module');
  });

  test('a module type points at its section on the api page', () => {
    assert.equal(top('Modules.Map.View').url, '/modules/ti.map/api#Modules.Map.View');
  });

  test('returns nothing for prose, which is Pagefind’s half', () => {
    assert.deepEqual(lookupSymbols(table, 'hyperloop', 5), []);
    assert.deepEqual(lookupSymbols(table, '   ', 5), []);
  });

  test('respects the limit', () => {
    assert.ok(lookupSymbols(table, 'Window', 2).length <= 2);
  });
});
