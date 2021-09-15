const paper = require("paper");
const fs = require("fs");
const Renderer = require("./map-fragment/draw/renderer").Renderer;
const MapReader = require("./map-fragment/reader/MapReader").MapReader;

require("./data/mapExport");
require("./data/colors");
let data = mapData;

let reader = new MapReader(data, colors);

let idLimits = 6295;

let roomLimits = reader.roomIndex[idLimits];
let area = reader.getAreaById(roomLimits.id);
let scale = 30;
let padding = 10
let limit = false;

let renderer = new Renderer(null, reader, area, reader.getColors(), {scale: scale, roomSize: 1, gridSize: 2, renderLabels: true});
renderer.renderSelection(idLimits);
renderer.renderPosition(idLimits)
renderer.render();
let bounds
if (!limit) {
    bounds = 'content';
} else {
    bounds = new paper.Rectangle(renderer.getRealPoint(new paper.Point(roomLimits.x, roomLimits.y)).subtract(padding * scale), padding * 2 * scale, padding * 2 * scale);
}
var svg = renderer.paper.project.exportSVG({ asString: true, bounds: bounds });
fs.writeFileSync("dist/map.svg", svg);
console.log("Map generated");
