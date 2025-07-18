"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_dijkstra_1 = require("node-dijkstra");
var PathFinder = /** @class */ (function () {
    function PathFinder(reader) {
        var _this = this;
        this.route = new node_dijkstra_1.default();
        reader.getAreas().forEach(function (area) { return area.rooms.forEach(function (room) {
            var exits = Object.values(room.exits).concat(Object.values(room.specialExits)).map(function (item) { var _a; return [item, (_a = room.weight) !== null && _a !== void 0 ? _a : 1]; });
            _this.route.addNode(room.id.toString(), Object.fromEntries(exits));
        }); });
    }
    PathFinder.prototype.path = function (from, to) {
        return this.route.path(from.toString(), to.toString());
    };
    return PathFinder;
}());
exports.default = PathFinder;
