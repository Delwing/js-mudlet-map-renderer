"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Area_1 = require("./Area");
var MapReader = /** @class */ (function () {
    function MapReader(data, colors) {
        var _this = this;
        this.mapDataIndex = {};
        this.roomIndex = {};
        this.data = data;
        this.data.sort(function (areaElement1, areaElement2) {
            if (areaElement1.areaName < areaElement2.areaName) {
                return -1;
            }
            if (areaElement1.areaName > areaElement2.areaName) {
                return 1;
            }
            return 0;
        });
        data.forEach(function (value, index) {
            _this.mapDataIndex[value.areaId] = index;
            value.rooms.forEach(function (room) {
                room.areaId = value.areaId;
                _this.roomIndex[room.id] = room;
            });
        });
        this.colors = {};
        colors.forEach(function (element) {
            _this.colors[parseInt(element.envId)] = element.colors;
        });
        this.colors.default = [255, 255, 255];
    }
    MapReader.prototype.getAreas = function () {
        return this.data;
    };
    MapReader.prototype.getArea = function (areaId, zIndex, limits) {
        var area = this.data[this.mapDataIndex[areaId]];
        var levels = new Set();
        var candidateArea = new Area_1.default(areaId, area.areaName, area.rooms.filter(function (room) {
            levels.add(room.z);
            var isWithinBounds = true;
            if (limits) {
                isWithinBounds = limits.xMin < room.x && limits.xMax > room.x && limits.yMin < room.y && limits.yMax > room.y;
            }
            return isWithinBounds;
        }), area.labels.filter(function (label) {
            var isWithinBounds = true;
            if (limits) {
                isWithinBounds = limits.xMin < label.X && limits.xMax > label.X && limits.yMin < label.Y && limits.yMax > label.Y;
            }
            return isWithinBounds;
        }), zIndex, levels);
        if (area.rooms.length > 0 && !levels.has(zIndex)) {
            candidateArea = this.getArea(areaId, levels.values().next().value);
        }
        return candidateArea;
    };
    MapReader.prototype.getAreaProperties = function (areaId) {
        return this.data[this.mapDataIndex[areaId]];
    };
    MapReader.prototype.getAreaByRoomId = function (id, limits) {
        var room = this.getRoomById(id);
        if (room === undefined) {
            return;
        }
        return this.getArea(room.areaId, room.z, limits);
    };
    MapReader.prototype.getColors = function () {
        return this.colors;
    };
    MapReader.prototype.getRoomById = function (id) {
        return this.roomIndex[id];
    };
    return MapReader;
}());
exports.default = MapReader;
