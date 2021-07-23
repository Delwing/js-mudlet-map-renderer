class Area {
    constructor(areaId, areaName, rooms, labels, zIndex, levels) {
        this.areaId = parseInt(areaId);
        this.areaName = areaName;
        this.rooms = [];
        this.labels = labels;
        let that = this;
        rooms.forEach(function (element) {
            that.rooms[element.id] = element;
        });
        this.levels = levels;
        this.zIndex = zIndex;
    }

    getAreaBounds() {
        let minX = 9999999999;
        let minY = 9999999999;
        let maxX = -9999999999;
        let maxY = -9999999999;
        this.rooms.forEach(function (element) {
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x);
            maxY = Math.max(maxY, element.y);
        });
        return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, width : maxX - minX, height : maxY - minY }
    }

    getRoomById(id) {
        return this.rooms[id];
    }

    getLevels() {
        return this.levels;
    }

    getZIndex() {
        return this.zIndex;
    }
}

module.exports = {
    Area: Area
}