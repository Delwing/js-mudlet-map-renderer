const paper = require("paper")
const Renderer = require("./map-fragment/draw/renderer").Renderer
const MapReader = require("./map-fragment/reader/MapReader").MapReader

let data = require("./data/mapExport")
let colors = require("./data/colors")

let reader = new MapReader(data, colors)
let area = reader.getArea(33, 0)
let renderer = new Renderer(document.getElementById("map"), area, reader.getColors(), 20, 20, 10)
renderer.render()
renderer.transform()