import { anchorAllocator, anchorFor } from './links.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const LABELS = ['property', 'method', 'event'];
/** Members are compared by identity, so each needs to be its own object. */
const m = (name: string) => ({ name });

describe('anchorAllocator', () => {
  test('leaves unique names as bare anchors', () => {
    const [bg, add, click] = [m('backgroundColor'), m('add'), m('click')];
    const at = anchorAllocator([[bg], [add], [click]], LABELS);
    assert.equal(at(bg), 'backgroundColor');
    assert.equal(at(add), 'add');
    assert.equal(at(click), 'click');
  });

  test('the earlier group keeps the bare anchor when two groups share a name', () => {
    // Titanium.UI.Window really does have both.
    const [openMethod, openEvent] = [m('open'), m('open')];
    const at = anchorAllocator([[], [openMethod], [openEvent]], LABELS);
    assert.equal(at(openMethod), 'open');
    assert.equal(at(openEvent), 'open-event');
  });

  test('a property and an event under one name both stay addressable', () => {
    // ti.map's View, and 40 other types in the registry.
    const [prop, evt] = [m('userLocation'), m('userLocation')];
    const at = anchorAllocator([[prop], [], [evt]], LABELS);
    assert.equal(at(prop), 'userLocation');
    assert.equal(at(evt), 'userLocation-event');
    assert.notEqual(at(prop), at(evt));
  });

  test('every anchor on a page is distinct', () => {
    const groups = [[m('open')], [m('open')], [m('open')]];
    const at = anchorAllocator(groups, LABELS);
    const ids = groups.flat().map(at);
    assert.equal(new Set(ids).size, ids.length, ids.join(', '));
  });

  test('qualifies with a prefix for a page carrying several types', () => {
    const zoom = m('zoom');
    const at = anchorAllocator([[zoom]], LABELS, 'Modules.Map.View.');
    assert.equal(at(zoom), 'Modules.Map.View.zoom');
  });

  test('prefixed anchors still disambiguate across groups', () => {
    const [prop, evt] = [m('zoom'), m('zoom')];
    const at = anchorAllocator([[prop], [], [evt]], LABELS, 'Modules.Map.View.');
    assert.equal(at(prop), 'Modules.Map.View.zoom');
    assert.equal(at(evt), 'Modules.Map.View.zoom-event');
  });

  test('falls back to the plain anchor for a member it was not given', () => {
    const at = anchorAllocator([[m('a')]], LABELS);
    assert.equal(at(m('unknown')), anchorFor('unknown'));
  });

  test('keeps anchors URL-safe', () => {
    const odd = m('odd name!');
    const at = anchorAllocator([[odd]], LABELS);
    assert.equal(at(odd), 'odd-name-');
  });
});
