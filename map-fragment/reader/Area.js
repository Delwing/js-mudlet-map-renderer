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
        if (this.bounds === undefined) {
            let minX = 9999999999;
            let minY = 9999999999;
            let maxX = -9999999999;
            let maxY = -9999999999;
            this.rooms.forEach((room) => {
                if (room.z !== this.zIndex) {
                    return;
                }
                minX = Math.min(minX, room.x);
                minY = Math.min(minY, room.y);
                maxX = Math.max(maxX, room.x);
                maxY = Math.max(maxY, room.y);
            });
            this.labels.forEach((label) => {
                if (label.Z !== this.zIndex) {
                    return;
                }
                minX = Math.min(minX, label.X);
                minY = Math.min(minY, label.Y);
                maxX = Math.max(maxX, label.X + label.Width);
                maxY = Math.max(maxY, label.Y + label.Height);
            });
            this.bounds = { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
        }

        return this.bounds;
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
    Area: Area,
};
