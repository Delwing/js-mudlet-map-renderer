# Mudlet Map Renderer

Mudlet map rendering library. Can be used in Node.js and in browser.

Until version `1.0.0` API is subject of change. Use with caution!

## TODO

- [ ] Publish some examples (with data)
- [ ] Convert to .ts
- [ ] Document functions
- [ ] Add test
- [ ] Add lint
- [ ] Align model with mudlet-map-binary-reader


## Very basic example

```js
const fs = require("fs");
const { MudletMapReader } = require("mudlet-map-binary-reader") //npm mudlet-map-binary-reader
const { Renderer, MapReader } = require("mudlet-map-renderer")

let map = MudletMapReader.read("./data/map.dat");
MudletMapReader.export(map, "./data");
let mapData = require("./data/mapExport.json");
let mapColors = require("./data/colors.json");

let reader = new MapReader(mapData, mapColors);

const roomId = 1;
const scale = 40;
let area = reader.getAreaByRoomId(roomId);
let settings = { scale: scale}
let renderer = new Renderer(null, reader, area, reader.getColors(), settings);
fs.writeFileSync("mapFull.svg", renderer.exportSvg());
fs.writeFileSync("mapFragment.svg", renderer.exportSvg(roomId, 10));
console.log("Map generated");
```

## Settings and their default values 
```js
class Settings {
    isRound = false;
    scale = 55;
    roomSize = 10;
    exitsSize = 2;
    borders = false;
    frameMode = false;
    areaName = true;
    showLabels = true;
    uniformLevelSize = false;
    fontFamily = 'sans-serif';
    mapBackground = "#000000";
}
```