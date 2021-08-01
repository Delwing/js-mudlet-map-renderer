const paper = require("paper")
const fs = require('fs');
const Renderer = require("./map-fragment/draw/renderer").Renderer
const MapReader = require("./map-fragment/reader/MapReader").MapReader

require("./map-fragment/data/mapExport")
require("./map-fragment/data/colors")
let data = mapData

let reader = new MapReader(data, colors)

let idLimits = 6500

let roomLimits = reader.roomIndex[idLimits]
let offset = 20
let area = reader.getAreaById(roomLimits.id)

let scale = 30
let padding = 10

let renderer = new Renderer(null, area, reader.getColors(), scale, "./data/labels")
renderer.render()
renderer.renderPosition(idLimits)
renderer.transform()
let bounds = new paper.Rectangle(renderer.getRealPoint(new paper.Point(roomLimits.x, roomLimits.y)).subtract(padding * scale), padding * 2 * scale, padding * 2 * scale)
var svg = renderer.paper.project.exportSVG({asString:true, bounds1 : bounds});
fs.writeFileSync('map.svg', svg);
console.log("Map generated")
