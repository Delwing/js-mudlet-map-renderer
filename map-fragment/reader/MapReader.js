let Area = require("./Area").Area;

class MapReader {
    constructor(data, colors) {
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
        data.forEach((value, index) => {
            this.mapDataIndex[value.areaId] = index;
            value.rooms.forEach((room) => {
                room.areaId = value.areaId;
                this.roomIndex[room.id] = room;
            });
        });
        this.colors = {};
        colors.forEach((element) => {
            this.colors[parseInt(element.envId)] = element.colors;
        });
        this.colors.default = [255, 255, 255];
    }

    getAreas() {
        return this.data;
    }

    getArea(areaId, zIndex, limits) {
        let area = this.data[this.mapDataIndex[areaId]];
        let levels = new Set();
        let candidateArea = new Area(
            areaId,
            area.areaName,
            area.rooms.filter((room) => {
                levels.add(parseInt(room.z));
                let isWithinBounds = true;
                if (limits) {
                    isWithinBounds = limits.xMin < room.x && limits.xMax > room.x && limits.yMin < room.y && limits.yMax > room.y;
                }
                return isWithinBounds;
            }),
            area.labels.filter((label) => {
                let isWithinBounds = true;
                if (limits) {
                    isWithinBounds = limits.xMin < label.X && limits.xMax > label.X && limits.yMin < label.Y && limits.yMax > label.Y;
                }
                return isWithinBounds;
            }),
            zIndex,
            levels
        );
        if (area.rooms.length > 0 && !levels.has(zIndex)) {
            candidateArea = this.getArea(areaId, levels.values().next().value);
        }
        return candidateArea;
    }

    getAreaProperties(areaId) {
        return this.data[this.mapDataIndex[areaId]];
    }

    getAreaByRoomId(id, limits) {
        let room = this.getRoomById(id);
        if (room === undefined) {
            return;
        }
        return this.getArea(room.areaId, room.z, limits);
    }

    getColors() {
        return this.colors;
    }

    getRoomById(id) {
        return this.roomIndex[id];
    }

}

module.exports = {
    MapReader
};
