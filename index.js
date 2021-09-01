const paper = require("paper");
const Renderer = require("./map-fragment/draw/renderer").Renderer;
const MapReader = require("./map-fragment/reader/MapReader").MapReader;

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

let reader = new MapReader(mapData, colors);
let area = reader.getArea(params.area, 0);

let renderer = new Renderer(document.getElementById("map"), reader, area, reader.getColors(), 30, 10, 5);
renderer.render();
//renderer.controls.centerRoom(1111)
//renderer.controls.setZoom(15)

if (params.area2 !== undefined) {
    let area2 = reader.getArea(params.area2 , 0) 
    let renderer1 = new Renderer(document.getElementById("map2"), reader, area2, reader.getColors(), 30, 20, 5);
    renderer1.render();
    //renderer1.controls.centerRoom(1111)
    //renderer1.controls.setZoom(15)
}

document.getElementById("map").addEventListener('roomClick', function(room) {
    console.log(room)
})

