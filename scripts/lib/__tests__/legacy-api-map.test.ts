import type { ApiType } from '../../../src/lib/registry/index.ts';
import {
  MODULE_IDS,
  buildRedirects,
  inlineSites,
  legacyUrls,
  unusedNamespaces,
  ymlNamespaces,
  type Corpus,
  type LegacyPage,
} from '../legacy-api-map.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The rules that decide where a fifteen-year-old inbound link lands.
 *
 * Every case here is one the real corpus contains, so a change that looks
 * harmless in the abstract — dropping the heading lookup, flattening the two
 * destination trees — fails against the shape of the data rather than against
 * a fixture invented to suit the code.
 */

const page = (rel: string, name: string, yml = '', section = false): LegacyPage => ({
  rel,
  name,
  yml,
  section,
});

const corpus = (types: string[], inlined: Corpus['inlined'] = new Map()): Corpus => ({
  types: new Set(types),
  inlined,
});

describe('legacyUrls', () => {
  test('appends .html, because that is what the static export served', () => {
    assert.deepEqual(legacyUrls(page('titanium/ui/view.md', 'Titanium.UI.View')), [
      '/api/titanium/ui/view.html',
    ]);
  });

  test('the section index answers on both the bare path and index.html', () => {
    assert.deepEqual(legacyUrls(page('README.md', 'API Reference')), ['/api', '/api/index.html']);
  });

  test('a section header also claims the extension-less path the sidebar links', () => {
    assert.deepEqual(legacyUrls(page('titanium/ui.md', 'Titanium.UI', '', true)), [
      '/api/titanium/ui.html',
      '/api/titanium/ui',
    ]);
  });
});

describe('ymlNamespaces', () => {
  test('recovers the owner of a struct flattened out of its module', () => {
    const pages = [
      page('modules/ble/central.md', 'Modules.BLE.Central', 'Central.yml'),
      page('structs/modules/ble/descriptor.md', 'Modules.BLE.Descriptor', 'Descriptor.yml'),
    ];
    assert.equal(ymlNamespaces(pages).get('Central.yml'), 'ble');
    assert.equal(ymlNamespaces(pages).get('Descriptor.yml'), 'ble');
  });

  test('refuses a file two modules claim', () => {
    // Apple Sign-In and Facebook both ship a LoginButton.yml.
    const pages = [
      page(
        'modules/applesignin/loginbutton.md',
        'Modules.Applesignin.LoginButton',
        'LoginButton.yml'
      ),
      page('modules/facebook/loginbutton.md', 'Modules.Facebook.LoginButton', 'LoginButton.yml'),
    ];
    assert.equal(ymlNamespaces(pages).get('LoginButton.yml'), undefined);
  });
});

describe('inlineSites', () => {
  const types = [
    {
      name: 'Titanium.Network.Socket.TCP',
      methods: [
        {
          name: 'accept',
          parameters: [{ name: 'options', type: [{ kind: 'type', name: 'AcceptDict' }] }],
        },
      ],
      properties: [],
      events: [],
    },
  ] as unknown as ApiType[];

  test('finds the member that absorbed a pseudo-type, however deeply nested', () => {
    const sites = inlineSites(types, new Set(['AcceptDict']));
    assert.deepEqual(sites.get('AcceptDict'), {
      owner: 'Titanium.Network.Socket.TCP',
      member: 'accept',
    });
  });

  test('ignores type references that were not inlined', () => {
    assert.equal(inlineSites(types, new Set()).size, 0);
  });
});

describe('buildRedirects', () => {
  test('sends an SDK type to the versionless reference path', () => {
    const map = buildRedirects(
      [page('titanium/ui/view.md', 'Titanium.UI.View', 'Titanium/UI/View.yml')],
      corpus(['Titanium.UI.View'])
    );
    assert.deepEqual(map.sdk, [
      { source: '/api/titanium/ui/view.html', destination: '/docs/sdk/latest/Titanium.UI.View' },
    ]);
    assert.deepEqual(map.modules, []);
  });

  test('restores casing the old lowercased path had thrown away', () => {
    const map = buildRedirects(
      [page('structs/apsconnectiondelegate.md', 'APSConnectionDelegate', 'Titanium/Network.yml')],
      corpus(['APSConnectionDelegate'])
    );
    assert.equal(map.sdk[0]?.destination, '/docs/sdk/latest/APSConnectionDelegate');
  });

  test('points an inlined pseudo-type at the member that now carries its fields', () => {
    const map = buildRedirects(
      [page('structs/acceptdict.md', 'AcceptDict', 'Titanium/Network/Socket/TCP.yml')],
      corpus(
        ['Titanium.Network.Socket.TCP'],
        new Map([['AcceptDict', { owner: 'Titanium.Network.Socket.TCP', member: 'accept' }]])
      )
    );
    assert.equal(map.sdk[0]?.destination, '/docs/sdk/latest/Titanium.Network.Socket.TCP#accept');
  });

  test('an inlined type with nowhere to point lands on the index and is reported', () => {
    const map = buildRedirects(
      [page('structs/cputimes.md', 'CPUTimes', 'Titanium/Platform.yml')],
      corpus([])
    );
    assert.equal(map.sdk[0]?.destination, '/docs/sdk/latest');
    assert.deepEqual(map.unresolved, ['/api/structs/cputimes.html']);
  });

  test('module pages go to the registry tree, keyed on moduleid not namespace', () => {
    const map = buildRedirects(
      [page('modules/ble/central.md', 'Modules.BLE.Central', 'Central.yml')],
      corpus([])
    );
    assert.deepEqual(map.modules, [
      { source: '/api/modules/ble/central.html', destination: '/modules/appcelerator.ble' },
    ]);
    assert.deepEqual(map.sdk, []);
  });

  test('a module struct stranded in structs/ follows its apidoc file home', () => {
    const map = buildRedirects(
      [
        page('modules/coremotion.md', 'Modules.CoreMotion', 'CoreMotion.yml'),
        page('structs/coremotionacceleration.md', 'CoreMotionAcceleration', 'CoreMotion.yml'),
      ],
      corpus([])
    );
    assert.deepEqual(
      map.modules.map((r) => r.destination),
      ['/modules/ti.coremotion', '/modules/ti.coremotion']
    );
    assert.deepEqual(map.unresolved, []);
  });

  test('refuses to guess when a namespace has no known moduleid', () => {
    assert.throws(
      () =>
        buildRedirects(
          [page('modules/newthing.md', 'Modules.NewThing', 'NewThing.yml')],
          corpus([])
        ),
      /no moduleid known/
    );
  });

  test('sources are sorted, so a regen that changes nothing produces no diff', () => {
    const pages = [
      page('titanium/ui/window.md', 'Titanium.UI.Window', 'Titanium/UI/Window.yml'),
      page('titanium/ui/button.md', 'Titanium.UI.Button', 'Titanium/UI/Button.yml'),
    ];
    const names = ['Titanium.UI.Window', 'Titanium.UI.Button'];
    assert.deepEqual(
      buildRedirects(pages, corpus(names)).sdk.map((r) => r.source),
      ['/api/titanium/ui/button.html', '/api/titanium/ui/window.html']
    );
  });
});

describe('MODULE_IDS', () => {
  test('every legacy namespace maps to a distinct moduleid', () => {
    const ids = Object.values(MODULE_IDS);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('reports entries the corpus no longer uses', () => {
    assert.deepEqual(
      unusedNamespaces([page('modules/map.md', 'Modules.Map', 'Map.yml')]).length,
      15
    );
  });
});
