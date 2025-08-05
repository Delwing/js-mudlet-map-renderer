const test = require('node:test');
const assert = require('assert');
const { PathFinder } = require('../map-fragment/reader/PathFinder');
const { MapReader } = require('../map-fragment/reader/MapReader');

test('finds path within an area and caches result', () => {
  const mapData = [
    {
      areaId: 1,
      areaName: 'Area1',
      rooms: [
        { id: 1, exits: { 2: 2 }, specialExits: {}, weight: 1, x: 0, y: 0, z: 0 },
        { id: 2, exits: { 1: 1 }, specialExits: {}, weight: 1, x: 1, y: 0, z: 0 }
      ],
      labels: []
    }
  ];
  const reader = new MapReader(mapData, []);
  const pf = new PathFinder(reader);
  const first = pf.path(1, 2);
  assert.deepStrictEqual(first, ['1', '2']);
  assert.strictEqual(pf.pathCache.size, 1);
  const second = pf.path(1, 2);
  assert.deepStrictEqual(second, ['1', '2']);
  assert.strictEqual(pf.pathCache.size, 1);
  assert.ok(pf.areaGraphs.has(1));
  assert.strictEqual(pf.globalGraph, undefined);
});

test('falls back to global graph for cross-area paths', () => {
  const mapData = [
    {
      areaId: 1,
      areaName: 'Area1',
      rooms: [
        { id: 1, exits: { 2: 2 }, specialExits: {}, weight: 1, x: 0, y: 0, z: 0 },
        { id: 2, exits: { 1: 1, 3: 3 }, specialExits: {}, weight: 1, x: 1, y: 0, z: 0 }
      ],
      labels: []
    },
    {
      areaId: 2,
      areaName: 'Area2',
      rooms: [
        { id: 3, exits: { 2: 2, 4: 4 }, specialExits: {}, weight: 1, x: 2, y: 0, z: 0 },
        { id: 4, exits: { 3: 3 }, specialExits: {}, weight: 1, x: 3, y: 0, z: 0 }
      ],
      labels: []
    }
  ];
  const reader = new MapReader(mapData, []);
  const pf = new PathFinder(reader);
  const path = pf.path(1, 4);
  assert.deepStrictEqual(path, ['1', '2', '3', '4']);
  assert.ok(pf.globalGraph);
  assert.strictEqual(pf.areaGraphs.size, 0);
});
