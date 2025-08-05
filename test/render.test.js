const assert = require('assert');
const fs = require('fs');
const { createCanvas } = require('canvas');
const { Renderer, MapReader, Settings } = require('../exports');

const data = [
    {
        areaId: 1,
        areaName: 'A1',
        rooms: [
            { id: 1, exits: { e: 2 }, specialExits: {}, customLines: {}, doors: {}, weight: 1, x: 0, y: 0, z: 0 },
            { id: 2, exits: { w: 1, e: 3 }, specialExits: {}, customLines: {}, doors: {}, weight: 1, x: 1, y: 0, z: 0 },
            { id: 3, exits: { w: 2 }, specialExits: {}, customLines: {}, doors: {}, weight: 1, x: 2, y: 0, z: 0 },
        ],
        labels: [],
    },
];

const reader = new MapReader(data, []);
const area = reader.getArea(1, 0);
const settings = new Settings();
const padding = 7;
const bounds = area.getAreaBounds();
const width = (bounds.maxX - bounds.minX + padding * 2) * settings.scale;
const height = (bounds.maxY - bounds.minY + padding * 2) * settings.scale;
const canvas = createCanvas(width, height);

const renderer = new Renderer(canvas, reader, reader.getColors(), settings);
renderer.isVisual = false;
renderer.renderArea(area);

const outPath = 'test/render-output.png';
fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
assert.ok(fs.existsSync(outPath));
const stats = fs.statSync(outPath);
assert.ok(stats.size > 0);
fs.unlinkSync(outPath);

console.log('Render test passed.');
