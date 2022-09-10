const paper = require("paper");
const MapReader = require("../reader/MapReader").MapReader;
const Controls = require("./controls").Controls;

const padding = 7;
const gridSize = 20;

const Colors = {
    OPEN_DOOR : new paper.Color(10 / 255, 155 / 255, 10 / 255),
    CLOSED_DOOR : new paper.Color(226 / 255, 205 / 255, 59 / 255),
    LOCKED_DOOR : new paper.Color(155 / 255, 10 / 255, 10 / 255)
}

class Settings {
    constructor() {
        this.isRound = false;
        this.scale = 55;
        this.roomSize = 10;
        this.exitsSize = 2;
        this.borders = false;
        this.frameMode = false;
        this.areaName = true;
        this.showLabels = true;
        this.uniformLevelSize = false;
        this.fontFamily = 'sans-serif';
        this.mapBackground = "#000000";
        this.transparentLabels = false;
    }
}

paper.Item.prototype.registerClick = function (callback) {
    if (typeof document !== "undefined") {
        this.onClick = callback;
    }
};

paper.Item.prototype.pointerReactor = function (element) {
    if (typeof document !== "undefined") {
        this.onMouseEnter = () => (element.style.cursor = "pointer");
        this.onMouseLeave = () => (element.style.cursor = "default");
    }
};

class Renderer {
    /**
     *
     * @param {HTMLElement} element
     * @param {MapReader} reader
     * @param {*} area
     * @param {*} colors
     * @param {Settings} settings
     */
    constructor(element, reader, area, colors, settings) {
        this.settings = new Settings();
        Object.assign(this.settings, settings);
        this.reader = reader;
        this.area = area;
        this.colors = colors;
        this.scale = this.settings.scale;
        this.grideSize = this.settings.gridSize;
        this.roomSize = this.settings.roomSize;
        this.roomFactor = this.roomSize / gridSize;
        this.exitFactor = this.settings.exitsSize * 0.01;
        this.roomDiagonal = this.roomFactor * Math.sqrt(2);
        this.innerExits = ["up", "down", "u", "d", "in", "out", "i", "u"];
        this.paper = new paper.PaperScope();
        this.bounds = this.area.getAreaBounds(this.settings.uniformLevelSize);
        if (element == undefined) {
            element = new paper.Size((this.bounds.width + padding * 2) * this.scale, (this.bounds.height + padding * 2) * this.scale);
            this.isVisual = false;
        } else {
            this.isVisual = true;
            this.emitter = new EventTarget();
        }
        this.paper.setup(element);
        this.element = element;
        this.backgroundLayer = new paper.Layer();
        this.bgLabels = new paper.Layer();
        this.linkLayer = new paper.Layer();
        this.roomLayer = new paper.Layer();
        this.labelsLayer = new paper.Layer();
        this.specialLinkLayer = new paper.Layer();
        this.charsLayer = new paper.Layer();
        this.overlayLayer = new paper.Layer();
        this.exitsRendered = {};
        this.defualtColor = new paper.Color(this.colors.default[0] / 255, this.colors.default[1] / 255, this.colors.default[2] / 255);
        this.render();
    }

    render(pngRender = false) {
        this.pngRender = pngRender;
        this.renderBackground(this.bounds.minX - padding, this.bounds.minY - padding, this.bounds.maxX + padding, this.bounds.maxY + padding);
        this.renderHeader(this.bounds.minX - padding / 2, this.bounds.maxY + padding / 2);
        this.area.rooms
            .filter((room) => room.z == this.area.zIndex)
            .forEach((room) => {
                this.renderRoom(room);
            });
        if (this.area.labels !== undefined && this.settings.showLabels) {
            this.bgLabels.activate();
            this.area.labels
                .filter((label) => label.Z == this.area.zIndex)
                .forEach((value) => this.renderLabel(value), this);
        }
        this.matrix = new paper.Matrix(1, 0, 0, -1, -this.bounds.minX + padding, this.bounds.maxY + padding).scale(
            this.scale,
            new paper.Point(this.bounds.minX, this.bounds.maxY)
        );
        this.transform();
        if (this.isVisual) {
            this.controls = new Controls(this, this.reader, this.element, this.paper);
        }
    }

    transform() {
        let padding = 1 * this.scale;
        this.paper.project.layers.forEach((layer) => {
            layer.applyMatrix = false;
            layer.matrix = new paper.Matrix(1, 0, 0, -1, -this.bounds.minX + padding, this.bounds.maxY + padding).scale(
                this.scale,
                new paper.Point(this.bounds.minX, this.bounds.maxY)
            );
        });
    }

    renderBackground(x1, y1, x2, y2) {
        this.backgroundLayer.activate();
        let background = new paper.Path.Rectangle(new paper.Point(x1, y1), new paper.Point(x2, y2));
        background.fillColor = new paper.Color(this.settings.mapBackground);
        background.registerClick(() => {
            this.emitter.dispatchEvent(new CustomEvent("backgroundClick"));
        });
    }

    renderHeader(x, y) {
        if (this.settings.areaName) {
            this.backgroundLayer.activate();
            let header = new paper.PointText(x, y);
            header.fillColor = new paper.Color(1, 1, 1, 1);
            header.fontSize = 2.5;
            header.fontFamily = this.settings.fontFamily;
            header.content = this.area.areaName;
            header.scale(1, -1);
        }
    }

    renderRoom(room) {
        this.roomLayer.activate();
        let roomShape;
        if (!this.settings.isRound) {
            roomShape = new paper.Path.Rectangle(new paper.Point(room.x, room.y), new paper.Size(this.roomFactor, this.roomFactor));
        } else {
            roomShape = new paper.Path.Circle(new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2), this.roomFactor / 2);
        }
        let color = this.colors[room.env];
        if (color === undefined) {
            color = [114, 1, 0];
        }
        let roomColor = new paper.Color(color[0] / 255, color[1] / 255, color[2] / 255, 1);
        roomShape.fillColor = !this.settings.frameMode ? roomColor : new paper.Color(0, 0, 0);
        roomShape.strokeWidth = this.exitFactor;
        roomShape.strokeColor = !this.settings.borders || this.settings.frameMode ? roomColor : this.defualtColor;

        room.render = roomShape;

        room.exitsRenders = room.exitsRenders != undefined ? room.exitsRenders : [];
        for (let dir in room.exits) {
            if (this.innerExits.indexOf(dir) <= -1) {
                if (room.exits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dirLongToShort(dir))) {
                    this.renderLink(room, room.exits[dir], dir);
                }
            } else {
                this.renderInnerExit(room, dir);
            }
        }

        for (let dir in room.specialExits) {
            if (room.specialExits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dir)) {
                this.renderSpecialLink(room, dir, room.specialExits[dir]);
            }
        }

        for (let dir in room.customLines) {
            this.renderCustomLine(room, dir);
        }

        for (let dir in room.stubs) {
            this.renderStub(room, dirNumbers[room.stubs[dir]]);
        }

        this.renderChar(room);

        roomShape.pointerReactor(this.element);
        roomShape.registerClick(() => {
            this.emitter.dispatchEvent(new CustomEvent("roomClick", { detail: room }));
        });
    }

    renderLink(room, targetId, dir) {
        let exitKey = new Array(room.id, targetId).sort().join("#");
        if (this.exitsRendered[exitKey] && room.doors[dirLongToShort(dir)] === undefined) {
            return;
        }
        this.linkLayer.activate();
        let targetRoom = this.area.getRoomById(targetId);
        let exitPoint = new paper.Point(this.getExitX(room.x, dir), this.getExitY(room.y, dir));
        let path = new paper.Path();
        let secondPoint;
        if (targetRoom) {
            let connectedDir = getKeyByValue(targetRoom.exits, room.id);
            let isOneWay = connectedDir == undefined;
            secondPoint = new paper.Point(this.getExitX(targetRoom.x, connectedDir), this.getExitY(targetRoom.y, connectedDir));
            if (!isOneWay) {
                path.moveTo(exitPoint);
                path.lineTo(secondPoint);
                path.strokeWidth = this.exitFactor;
                path.strokeColor = this.defualtColor;
            } else {
                this.renderArrow(exitPoint, secondPoint, this.defualtColor, [], this.exitFactor, this.defualtColor, true);
            }
        } else {
            secondPoint = new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
            let color = this.colors[this.reader.getRoomById(targetId).env];
            if (color === undefined) {
                color = [114, 1, 0];
            }
            path = this.renderArrow(exitPoint, secondPoint, new paper.Color(color[0] / 255, color[1] / 255, color[2] / 255), [], this.exitFactor);
            path.rotate(180, exitPoint);
            path.scale(2);
            path.pointerReactor(this.element);
            path.registerClick(() => this.emitter.dispatchEvent(new CustomEvent("areaArrowClick", { detail: targetId })));
        }

        if (room.doors[dirLongToShort(dir)] !== undefined) {
            this.renderDoors(exitPoint, secondPoint, room.doors[dirLongToShort(dir)]);
        }

        this.exitsRendered[exitKey] = true;
        room.exitsRenders.push(path);
        if (targetRoom) {
            targetRoom.exitsRenders = targetRoom.exitsRenders != undefined ? targetRoom.exitsRenders : [];
            targetRoom.exitsRenders.push(path);
        }

        return path;
    }

    renderSpecialLink(room, targetId, dir) {
        this.linkLayer.activate();

        let path;
        let exitPoint = new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
        let targetRoom = this.area.getRoomById(targetId);
        let secondPoint;

        if (targetRoom) {
            path = new paper.Path();
            path.moveTo(exitPoint);
            let connectedDir = getKeyByValue(targetRoom.exits, room.id);
            secondPoint = new paper.Point(this.getExitX(targetRoom.x, connectedDir), this.getExitY(targetRoom.y, connectedDir));
            path.lineTo(secondPoint);

            path.strokeWidth = 1;
        } else {
            secondPoint = new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
            path = this.renderArrow(exitPoint, secondPoint, this.defualtColor, [], this.exitFactor);
            path.strokeColor = this.defualtColor;
            path.scale(1, exitPoint);
            path.rotate(180, exitPoint);
        }

        room.exitsRenders.push(path);
        if (targetRoom) {
            targetRoom.exitsRenders = targetRoom.exitsRenders != "undefined" ? targetRoom.exitsRenders : [];
            targetRoom.exitsRenders.push(path);
        }

        return path;
    }

    renderCustomLine(room, dir) {
        if (room.customLines[dir].points !== undefined && room.customLines[dir].points.length === 0) {
            return;
        }

        this.linkLayer.activate();

        let customLine = new paper.Group();

        let path = new paper.Path();
        let style = room.customLines[dir].attributes.style;
        if (style === "dot line") {
            path.dashArray = [0.05, 0.05];
            path.dashOffset = 0.1;
        } else if (style === "dash line") {
            path.dashArray = [0.4, 0.2];
        } else if (style === "solid line") {
        } else {
            console.log("Brak opisu stylu: " + style);
        }

        if (room.customLines[dir].attributes.color !== undefined) {
            let color = room.customLines[dir].attributes.color;
            path.strokeColor = new paper.Color(color.r / 255, color.g / 255, color.b / 255);
        } else {
            path.strokeColor = this.defualtColor;
        }
        let lastPoint = new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
        path.moveTo(lastPoint);

        if (room.customLines[dir].points !== undefined) {
            let points = [];

            room.customLines[dir].points.forEach((value) => points.push(value));

            for (let point in points) {
                let customPoint = points[point];
                let pointCoords = new paper.Point(customPoint.x + this.roomFactor / 2, customPoint.y + this.roomFactor / 2);
                lastPoint = new paper.Point(pointCoords);
                path.lineTo(lastPoint);
            }
        }

        customLine.addChild(path);

        if (room.customLines[dir].attributes.arrow && path.segments.length > 1) {
            let arrow = this.renderArrow(
                path.segments[path.segments.length - 2].point,
                path.segments[path.segments.length - 1].point,
                path.strokeColor,
                path.dashArray,
                this.exitFactor
            );
            customLine.addChild(arrow);
        }

        path.strokeWidth = this.exitFactor;
        path.orgStrokeColor = path.strokeColor;

        room.exitsRenders.push(customLine);

        return customLine;
    }

    renderArrow(lineStart, lineEnd, color, dashArray, strokeWidth, strokeColor, isOneWay) {
        let arrowPoint = lineEnd;
        let arrow = new paper.Path.RegularPolygon(arrowPoint, 3, this.roomDiagonal / 6);
        arrow.position = arrow.position.add(arrow.bounds.topCenter.subtract(arrow.bounds.center));
        arrow.rotate(lineEnd.subtract(lineStart).getAngle() + 90, lineEnd);
        let tailLine = new paper.Path.Line(lineStart, arrow.bounds.center);
        let path = new paper.Group([tailLine, arrow]);
        path.closed = true;
        arrow.fillColor = color;
        arrow.strokeColor = color;
        arrow.strokeWidth = this.exitFactor;
        tailLine.fillColor = strokeColor ? strokeColor : color;
        tailLine.strokeColor = strokeColor ? strokeColor : color;
        tailLine.dashArray = dashArray;
        tailLine.strokeWidth = this.exitFactor;

        if (isOneWay) {
            arrow.position = new paper.Point(lineEnd.x + (lineStart.x - lineEnd.x) / 2, lineEnd.y + (lineStart.y - lineEnd.y) / 2);
            tailLine.dashArray = [0.1, 0.1];
            path.fillColor = new paper.Color(1, 0, 0);
            arrow.scale(1.5);
        } else {
            tailLine.strokeWidth = strokeWidth;
        }

        return path;
    }

    renderStub(room, dir) {
        this.linkLayer.activate();
        let path;
        if (this.innerExits.indexOf(dir) > -1) {
            path = this.renderInnerExit(room, dir, true);
        } else {
            let startPoint = new paper.Point(room.x + this.roomFactor * 0.5, room.y + this.roomFactor * 0.5);
            let exitPoint = new paper.Point(this.getExitX(room.x, dir), this.getExitY(room.y, dir));
            path = new paper.Path();
            path.moveTo(startPoint);
            path.lineTo(exitPoint);
            path.pivot = startPoint;
            path.scale(2);
            path.position = exitPoint;
            path.strokeWidth = this.exitFactor;
            path.strokeColor = this.defualtColor;
        }
        return path;
    }

    renderInnerExit(room, direction, stub = false) {
        this.labelsLayer.activate();

        let group = new paper.Group();

        if (direction === "down" || direction == "d") {
            group.addChild(this.renderInnerTriangle(room, direction, stub));
        }

        if (direction === "up" || direction === "u") {
            group.addChild(this.renderInnerTriangle(room, direction, stub));
            group.rotate(180, room.render.bounds.center);
        }

        if (direction === "in" || direction === "i") {
            let left = this.renderInnerTriangle(room, direction, stub);
            left.rotate(90, room.render.bounds.center);
            left.scale(0.4, room.render.bounds.center);
            left.position.x -= 0.01;
            let right = this.renderInnerTriangle(room, direction, stub);
            right.scale(0.4, room.render.bounds.center);
            right.rotate(270, room.render.bounds.center);
            right.position.x += 0.01;
            group.addChild(left);
            group.addChild(right);
        }

        if (direction === "out" || direction === "o") {
            let left = this.renderInnerTriangle(room, direction, stub);
            left.rotate(270, room.render.bounds.center);
            left.scale(0.5, room.render.bounds.rightCenter);
            left.rotate(180);
            left.position.x -= 0.01;
            let right = this.renderInnerTriangle(room, direction, stub);
            right.rotate(90, room.render.bounds.center);
            right.scale(0.5, room.render.bounds.leftCenter);
            right.rotate(180);
            right.position.x += 0.01;
            group.addChild(left);
            group.addChild(right);
        }

        if (this.settings.isRound) {
            group.scale(0.8, 0.8, new paper.Point(room.render.bounds.center));
        }
        group.locked = true;

        return group;
    }

    renderInnerTriangle(room, direction, stub) {
        let triangle = new paper.Path.RegularPolygon(
            new paper.Point(room.render.bounds.bottomCenter).subtract(new paper.Point(0, 0.2 * this.roomFactor)),
            3,
            0.3 * this.roomFactor
        );
        triangle.scale(1.2, 0.75);
        let baseColor = this.lightnessDependantColor(room);
        triangle.strokeWidth = this.exitFactor;
        if (!stub) {
            triangle.fillColor = new paper.Color(baseColor, baseColor, baseColor, 0.75);
        }

        triangle.strokeColor = new paper.Color(baseColor, baseColor, baseColor);

        let doorType = room.doors[dirsShortToLong(direction)];
        if (doorType !== undefined) {
            switch (doorType) {
                case 1:
                    triangle.strokeColor = Colors.OPEN_DOOR;
                    break;
                case 2:
                    triangle.strokeColor = Colors.CLOSED_DOOR;
                    break;
                default:
                    triangle.strokeColor = Colors.LOCKED_DOOR;
            }
        }

        triangle.bringToFront();
        return triangle;
    }

    renderChar(room) {
        this.charsLayer.activate();
        if (room.roomChar) {
            let size = 0.85 * this.roomFactor / room.roomChar.length;
            let x = this.pngRender ? room.render.position.x - 0.1 : room.render.position.x;
            let text = new paper.PointText(x, room.render.position.y + size / 4);
            if (!room.userData || room.userData["system.fallback_symbol_color"] === undefined) {
                text.fillColor = this.lightnessDependantColor(room);
            } else {
                text.fillColor = room.userData["system.fallback_symbol_color"];
            }
            text.fontSize = size;
            text.content = room.roomChar;
            text.justification = "center";
            text.locked = true;
            text.scale(1, -1);
        }
    }

    renderDoors(firstPoint, secondPoint, type) {
        this.specialLinkLayer.activate();
        let x = (firstPoint.x + secondPoint.x) / 2;
        let y = (firstPoint.y + secondPoint.y) / 2;
        let door = new paper.Path.Rectangle(x - 0.5, y - 0.5, 1, 1);
        door.scale(this.roomFactor * 0.5, door.center);
        switch (type) {
            case 1:
                door.strokeColor = Colors.OPEN_DOOR;
                break;
            case 2:
                door.strokeColor = Colors.CLOSED_DOOR;
                break;
            default:
                door.strokeColor = Colors.LOCKED_DOOR;
        }

        door.strokeWidth = this.exitFactor;
    }

    renderLabel(value) {
        if (false && value.pixMap) {
            //TODO Not really sure how to deal with pixMap labels here so they are ok both in .svg and browser
            let label = new paper.Raster("data:image/png;base64," + value.pixMap);
            label._size.width = value.Width;
            label._size.height = value.Height;
            label.position = new paper.Point(value.X + value.Width / 2, value.Y);
            label.scale(this.roomFactor * 0.08, -this.roomFactor * 0.08);
        } else {
            let background = new paper.Path.Rectangle(new paper.Point(value.X, value.Y - value.Height), new paper.Size(value.Width, value.Height));
            if (!this.settings.transparentLabels) {
                background.fillColor = new paper.Color(value.BgColor.r / 255, value.BgColor.g / 255, value.BgColor.b / 255);
            }
            let text = new paper.PointText(background.bounds.center.add(0, 0.15));
            text.fillColor = new paper.Color(value.FgColor.r / 255, value.FgColor.g / 255, value.FgColor.b / 255);
            text.fontSize = 0.75;
            text.content = value.Text;
            text.fontFamily = this.settings.fontFamily;
            text.justification = "center";
            text.locked = true;
            text.scale(1, -1);
        }
    }

    lightnessDependantColor(room) {
        if (room.render.fillColor.lightness > 0.41) {
            return 0.1;
        } else {
            return 0.9;
        }
    }

    getXMid(x) {
        return x + this.roomFactor / 2;
    }

    getYMid(y) {
        return y + this.roomFactor / 2;
    }

    getExitX(x, dir) {
        if (this.settings.isRound) {
            return x + 0.5 * this.roomFactor;
        }
        switch (dir) {
            case "west":
            case "w":
            case "northwest":
            case "nw":
            case "southwest":
            case "sw":
                return x;
            case "east":
            case "e":
            case "northeast":
            case "ne":
            case "southeast":
            case "se":
                return x + this.roomFactor;
            default:
                return x + 0.5 * this.roomFactor;
        }
    }

    getExitY(y, dir) {
        if (this.settings.isRound) {
            return y + 0.5 * this.roomFactor;
        }
        switch (dir) {
            case "north":
            case "n":
            case "northwest":
            case "nw":
            case "northeast":
            case "ne":
                return y + this.roomFactor;
            case "south":
            case "s":
            case "southwest":
            case "sw":
            case "southeast":
            case "se":
                return y;
            default:
                return y + 0.5 * this.roomFactor;
        }
    }

    getRealPoint(x, y) {
        return this.matrix.transform(new paper.Point(x, y));
    }

    getBounds() {
        return this.backgroundLayer.getBounds();
    }

    renderPosition(id, color) {
        this.clearPosition();
        this.overlayLayer.activate();
        let room = this.area.getRoomById(id);
        let circle = new paper.Shape.Circle(new paper.Point(room.x + this.roomFactor * 0.5, room.y + this.roomFactor * 0.5), this.roomDiagonal * 0.6);
        circle.fillColor = new paper.Color(0.5, 0.1, 0.1, 0.2);
        circle.strokeWidth = this.exitFactor * 5;
        circle.hadowColor = new paper.Color(1, 1, 1);
        circle.shadowBlur = 12;
        if (color === undefined) {
            color = [0, 0.9, 0.7];
        }
        circle.strokeColor = new paper.Color(color[0], color[1], color[2]);
        circle.dashArray = [0.05, 0.05];
        this.position = circle;
    }

    clearPosition() {
        if (this.position !== undefined) {
            this.position.remove();
        }
    }

    renderSelection(id, color) {
        this.clearSelection();
        this.overlayLayer.activate();
        let room = this.area.getRoomById(id);
        let selection = new paper.Path.Rectangle(new paper.Point(room.x - 0.05, room.y - 0.05), new paper.Size(this.roomFactor + 0.1, this.roomFactor + 0.1));
        selection.fillColor = new paper.Color(1, 1, 1, 0);
        selection.strokeWidth = this.exitFactor;
        if (color === undefined) {
            color = [0, 0.9, 0.7];
        }
        selection.strokeColor = new paper.Color(color[0], color[1], color[2]);
        this.selection = selection;
    }

    clearSelection() {
        if (this.selection !== undefined) {
            this.selection.remove();
        }
    }

    clear() {
        this.paper.clear();
    }

    exportSvg(roomId, padding) {        
        let bounds = 'content';
        if (roomId !== undefined) {
            let room = this.reader.roomIndex[roomId]
            if (room === undefined) {
                throw new Error(`Room ${roomId} not found.`)
            }
            bounds = new paper.Rectangle(this.getRealPoint(new paper.Point(room.x, room.y)).subtract(padding * this.scale), padding * 2 * this.scale, padding * 2 * this.scale);
        }
        return this.paper.project.exportSVG({ asString: true, bounds: bounds });
    }
}

module.exports = {
    Renderer: Renderer,
    Settings: Settings,
};

function getKeyByValue(obj, val) {
    for (let k in obj) {
        if (obj.hasOwnProperty(k) && obj[k] === val) {
            return k;
        }
    }
}

let dirs = {
    north: "n",
    south: "s",
    east: "e",
    west: "w",
    northeast: "ne",
    northwest: "nw",
    southeast: "se",
    southwest: "sw",
    up: "u",
    down: "d",
    in: "i",
    out: "o",
};

let dirNumbers = {
    1: "n",
    2: "ne",
    3: "nw",
    4: "e",
    5: "w",
    6: "s",
    7: "se",
    8: "sw",
    9: "u",
    10: "d",
    11: "i",
    12: "o",
};

function dirsShortToLong(dir) {
    let result = getKeyByValue(dirs, dir);
    return result !== undefined ? result : dir;
}

function dirLongToShort(dir) {
    return dirs[dir] !== undefined ? dirs[dir] : dir;
}
