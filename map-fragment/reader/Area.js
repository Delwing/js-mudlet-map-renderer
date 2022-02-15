class Area {
    constructor(areaId, areaName, rooms, labels, zIndex, levels) {
        this.areaId = parseInt(areaId);
        this.areaName = areaName;
        this.rooms = [];
        this.labels = labels;
        rooms.forEach(element => this.rooms[element.id] = element)
        this.levels = levels;
        this.zIndex = zIndex;
    }

    getAreaBounds(full = false) {
        if (this.bounds === undefined) {
            let minX = 9999999999;
            let minY = 9999999999;
            let maxX = -9999999999;
            let maxY = -9999999999;
            this.rooms.forEach((room) => {
                if (!full && room.z !== this.zIndex) {
                    return;
                }
                minX = Math.min(minX, room.x);
                minY = Math.min(minY, room.y);
                maxX = Math.max(maxX, room.x);
                maxY = Math.max(maxY, room.y);
            });
            this.labels.forEach((label) => {
                if (!full && label.Z !== this.zIndex) {
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

    limit(id, padding) {
        let room = this.rooms[id];
        let limits = {
            xMin: room.x - padding,
            xMax: room.x + padding,
            yMin: room.y - padding,
            yMax: room.y + padding,
        }

        let onScreen = this.rooms.filter(room => limits.xMin < room.x && limits.xMax > room.x && limits.yMin < room.y && limits.yMax > room.y).map(item => item.id)

        return new Area(this.areaId, this.areaName,
             this.rooms.filter(room => onScreen.includes(room.id) || Object.values(room.exits).filter(val => onScreen.includes(val)).length > 0), 
             this.labels.filter(label => limits.xMin < label.X && limits.xMax > label.X && limits.yMin < label.Y && limits.yMax > label.Y),
             this.zIndex, this.levels);   
    }
}

module.exports = {
    Area: Area,
};
