const assert = require('assert');
const { MapReader } = require('../map-fragment/reader/MapReader');
const { PathFinder } = require('../map-fragment/reader/PathFinder');

const data = [
    {
        areaId: 1,
        areaName: 'A1',
        rooms: [
            { id: 1, exits: { e: 2, x: 5 }, specialExits: {}, weight: 1, x: 0, y: 0, z: 0 },
            { id: 2, exits: { w: 1, e: 3 }, specialExits: {}, weight: 1, x: 1, y: 0, z: 0 },
            { id: 3, exits: { w: 2, x: 8 }, specialExits: {}, weight: 1, x: 2, y: 0, z: 0 },
        ],
        labels: [],
    },
    {
        areaId: 2,
        areaName: 'A2',
        rooms: [
            { id: 5, exits: { x: 1 }, specialExits: {}, weight: 1, x: 0, y: 0, z: 0 },
        ],
        labels: [],
    },
    {
        areaId: 3,
        areaName: 'A3',
        rooms: [
            { id: 8, exits: { x: 3 }, specialExits: {}, weight: 1, x: 0, y: 0, z: 0 },
        ],
        labels: [],
    },
];

const reader = new MapReader(data, []);
const finder = new PathFinder(reader);

assert.deepStrictEqual(finder.path(1, 3), ['1', '2', '3']);
assert.deepStrictEqual(finder.path(5, 8), ['5', '1', '2', '3', '8']);

console.log('All tests passed.');
