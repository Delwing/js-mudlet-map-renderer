const paper = require("paper");
const Renderer = require("./map-fragment/draw/renderer").Renderer;
const MapReader = require("./map-fragment/reader/MapReader").MapReader;

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

let reader = new MapReader(mapData, colors);
let area = reader.getArea(params.area, 0);
let area2 = reader.getArea(params.area2, 0);
let renderer = new Renderer(document.getElementById("map"), area, reader.getColors(), 30, 10, 5);
renderer.render();
renderer.transform();

let renderer1 = new Renderer(document.getElementById("map2"), area2, reader.getColors(), 30, 10, 5);
renderer1.render();
renderer1.transform();
