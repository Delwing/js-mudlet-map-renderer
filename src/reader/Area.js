"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Area = /** @class */ (function () {
    function Area(areaId, areaName, rooms, labels, zIndex, levels) {
        var _this = this;
        this.areaId = areaId;
        this.areaName = areaName;
        this.rooms = [];
        this.labels = labels;
        rooms.forEach(function (element) { return _this.rooms[element.id] = element; });
        this.levels = levels;
        this.zIndex = zIndex;
    }
    Area.prototype.getAreaBounds = function (full) {
        var _this = this;
        if (full === void 0) { full = false; }
        if (this.bounds === undefined) {
            var minX_1 = 9999999999;
            var minY_1 = 9999999999;
            var maxX_1 = -9999999999;
            var maxY_1 = -9999999999;
            this.rooms.forEach(function (room) {
                if (!full && room.z !== _this.zIndex) {
                    return;
                }
                minX_1 = Math.min(minX_1, room.x);
                minY_1 = Math.min(minY_1, room.y);
                maxX_1 = Math.max(maxX_1, room.x);
                maxY_1 = Math.max(maxY_1, room.y);
            });
            this.labels.forEach(function (label) {
                if (!full && label.Z !== _this.zIndex) {
                    return;
                }
                minX_1 = Math.min(minX_1, label.X);
                minY_1 = Math.min(minY_1, label.Y);
                maxX_1 = Math.max(maxX_1, label.X + label.Width);
                maxY_1 = Math.max(maxY_1, label.Y + label.Height);
            });
            this.bounds = { minX: minX_1, minY: minY_1, maxX: maxX_1, maxY: maxY_1 };
        }
        return this.bounds;
    };
    Area.prototype.getRoomById = function (id) {
        return this.rooms[id];
    };
    Area.prototype.getLevels = function () {
        return this.levels;
    };
    Area.prototype.getZIndex = function () {
        return this.zIndex;
    };
    Area.prototype.limit = function (id, padding) {
        var room = this.rooms[id];
        var limits = {
            xMin: room.x - padding,
            xMax: room.x + padding,
            yMin: room.y - padding,
            yMax: room.y + padding
        };
        var onScreen = this.rooms.filter(function (room) { return limits.xMin < room.x && limits.xMax > room.x && limits.yMin < room.y && limits.yMax > room.y; }).map(function (item) { return item.id; });
        return new Area(this.areaId, this.areaName, this.rooms.filter(function (room) { return onScreen.includes(room.id) || Object.values(room.exits).filter(function (val) { return onScreen.includes(val); }).length > 0; }), this.labels.filter(function (label) { return limits.xMin < label.X && limits.xMax > label.X && limits.yMin < label.Y && limits.yMax > label.Y; }), this.zIndex, this.levels);
    };
    return Area;
}());
exports.default = Area;
