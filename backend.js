const paper = require("paper");
const fs = require("fs");
const Renderer = require("./map-fragment/draw/renderer").Renderer;
const MapReader = require("./map-fragment/reader/MapReader").MapReader;

require("./data/mapExport");
require("./data/colors");
let data = mapData;

let reader = new MapReader(data, colors);

let idLimits = 6297;

let roomLimits = reader.roomIndex[idLimits];
let area = reader.getAreaById(roomLimits.id);

let scale = 30;

let renderer = new Renderer(null, area, reader.getColors(), scale);
renderer.render();
renderer.renderPosition(idLimits);
renderer.transform();
//let bounds = new paper.Rectangle(renderer.getRealPoint(new paper.Point(roomLimits.x, roomLimits.y)).subtract(padding * scale), padding * 2 * scale, padding * 2 * scale)
var svg = renderer.paper.project.exportSVG({ asString: true });
fs.writeFileSync("dist/map.svg", svg);
console.log("Map generated");
