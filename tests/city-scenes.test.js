import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_SCENES, resolveCityTheme } from '../shared/city-scenes.js';
import { MAPS } from '../shared/board.js';

test('all six regional scenes have distinct plans and clear traffic corridors', () => {
  assert.equal(Object.keys(CITY_SCENES).length, MAPS.length);
  const plans = new Set();
  for (const { id } of MAPS) {
    const scene = CITY_SCENES[id];
    assert(scene.lots.length >= 10 && scene.lots.length <= 65);
    plans.add(JSON.stringify(scene.lots.map(({u,v,w,d}) => [u,v,w,d])));
    for (const {u,v,w,d,h} of scene.lots) {
      assert(u >= 0 && v >= 0 && u+w <= 420 && v+d <= 420);
      assert(h > 0 && h < 140);
      for (const road of [140,280]) {
        assert(u+w <= road-16 || u >= road+16, `${id}: building blocks vertical traffic`);
        assert(v+d <= road-16 || v >= road+16, `${id}: building blocks horizontal traffic`);
      }
    }
  }
  assert.equal(plans.size, MAPS.length);
});

test('selected map resolves without metadata, including stale or custom snapshots', () => {
  for (const { id } of MAPS) {
    assert.equal(resolveCityTheme({settings:{map:id}}), id);
    assert.equal(resolveCityTheme({settings:{map:id},mapTheme:'trenches'}), id);
    assert.equal(resolveCityTheme({settings:{map:id},mapTheme:'custom'}), id);
  }
  assert.equal(resolveCityTheme({settings:{map:'custom:old'},mapTheme:'neon'}), 'custom');
  assert.equal(resolveCityTheme({mapTheme:'festival'}), 'festival');
  assert.equal(resolveCityTheme(), 'trenches');
});
