let MapReader = require("../reader/MapReader").MapReader;
const paper = require("paper");
let Controls = require("./controls").Controls;

const padding = 1;

class Settings {
    isRound = false;
    scale = 55;
    gridSize = 10;
    roomSize = 5;
    renderLabels = true;
    borders = false;
    frameMode = false;
}

class Renderer {
    /**
     * 
     * @param {HTMLElement} element 
     * @param {*} area 
     * @param {*} colors 
     * @param {Settings} settings 
     */
    constructor(element, area, colors, settings) {
        this.settings = new Settings();
        Object.assign(this.settings, settings);
        this.area = area;
        this.colors = colors;
        this.scale = this.settings.scale;
        this.baseSize = this.settings.gridSize;
        this.roomSize = this.settings.roomSize;
        this.renderLabels = this.settings.renderLabels;
        this.roomFactor = this.roomSize / this.baseSize;
        this.exitFactor = this.roomFactor * 2;
        this.roomDiagonal = this.roomFactor * Math.sqrt(2);
        this.ladders = ["up", "down"];
        this.paper = new paper.PaperScope();
        if (element == undefined) {
            let bounds = this.area.getAreaBounds();
            element = new paper.Size((bounds.width + padding * 2) * this.scale, (bounds.height + padding * 2) * this.scale);
            this.isVisual = false;
        } else {
            this.isVisual = true;
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
    }

    render(pngRender = false) {
        this.pngRender = pngRender;
        let bounds = this.area.getAreaBounds();
        let padding = 0.25 * this.scale;
        this.renderBackground(bounds.minX - padding, bounds.minY - padding, bounds.maxX + padding, bounds.maxY + padding);
        this.renderHeader();
        this.area.rooms.forEach((value) => {
            this.renderRoom(value);
        });
        if (this.area.labels !== undefined && this.renderLabels) {
            this.bgLabels.activate();
            this.area.labels.forEach((value) => this.renderLabel(value), this);
        }
        this.matrix = new paper.Matrix(1, 0, 0, -1, -bounds.minX + padding, bounds.maxY + padding).scale(this.scale, new paper.Point(bounds.minX, bounds.maxY));
        this.transform();
        if (this.isVisual) {
            this.controls = new Controls(this, this.element, this.paper);
        }
    }

    transform() {
        let bounds = this.area.getAreaBounds();
        let padding = 1 * this.scale;
        this.paper.project.layers.forEach((layer) => {
            layer.matrix = new paper.Matrix(1, 0, 0, -1, -bounds.minX + padding, bounds.maxY + padding).scale(
                this.scale,
                new paper.Point(bounds.minX, bounds.maxY)
            );
        });
    }

    renderBackground(x1, y1, x2, y2) {
        this.backgroundLayer.activate();
        let background = new paper.Path.Rectangle(new paper.Point(x1, y1), new paper.Point(x2, y2));
        background.fillColor = new paper.Color(0, 0, 0);
    }

    renderHeader() {
        this.backgroundLayer.activate();
        let bounds = this.getBounds();
        let header = new paper.PointText(bounds.x + 3, bounds.y + bounds.height - 3);
        header.fillColor = new paper.Color(1, 1, 1, 1);
        header.fontSize = 3;
        header.content = this.area.areaName;
        header.scale(1, -1);
    }

    renderRoom(room) {
        this.roomLayer.activate();
        let roomShape;
        if (!this.settings.isRound) {
            roomShape = new paper.Path.Rectangle(new paper.Point(room.x, room.y), new paper.Size(this.roomFactor, this.roomFactor));
        } else {
            roomShape = new paper.Path.Circle(new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2), this.roomFactor / 2 )
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
            if (this.ladders.indexOf(dir) <= -1) {
                if (room.exits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dirLongToShort(dir))) {
                    this.renderLink(room, room.exits[dir], dir);
                }
            } else {
                this.renderLadder(room, dir);
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

        if (this.isVisual) {
            this.pointerReactor(roomShape);
            roomShape.onClick = () => {
                this.element.dispatchEvent(new CustomEvent("roomClick", { detail: room }));
            };
        }
    }

    renderLink(room, targetId, dir) {
        let exitKey = new Array(room.id, targetId).sort().join("#");
        if (this.exitsRendered[exitKey]) {
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
                path.strokeWidth = 1 * this.roomFactor;
                path.strokeColor = this.defualtColor;
            } else {
                this.renderArrow(exitPoint, secondPoint, this.defualtColor, [], 1, this.defualtColor, true);
            }
        } else {
            secondPoint = new paper.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
            let color = this.colors[room.env];
            if (color === undefined) {
                color = [114, 1, 0];
            }
            path = this.renderArrow(exitPoint, secondPoint, new paper.Color(color[0] / 255, color[1] / 255, color[2] / 255), [], 1);
            path.rotate(180, exitPoint);
        }

        if (room.doors[dirLongToShort(dir)] !== undefined) {
            this.renderDoors(exitPoint, secondPoint);
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
            path = this.renderArrow(exitPoint, secondPoint, this.defualtColor, [], 1);
            path.strokeColor = this.defualtColor;
            path.scale(1, exitPoint);
            path.rotate(180, exitPoint);
        }

        if (room.doors[dirLongToShort(dir)] !== undefined) {
            this.renderDoors(exitPoint, secondPoint);
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
            path.dashArray = [1, 1];
        } else if (style === "dash line") {
            path.dashArray = [4, 2];
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

        path.orgStrokeColor = path.strokeColor;

        return path;
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
            tailLine.dashArray = [1, 1];
            path.fillColor = new paper.Color(1, 0, 0);
            arrow.scale(1.5);
        } else {
            tailLine.strokeWidth = strokeWidth;
        }

        return path;
    }

    renderStub(room, dir) {
        this.linkLayer.activate();
        let startPoint = new paper.Point(room.x + 0.25, room.y + 0.25);
        let exitPoint = new paper.Point(this.getExitX(room.x, dir), this.getExitY(room.y, dir));
        let path = new paper.Path();
        path.moveTo(startPoint);
        path.lineTo(exitPoint);
        path.pivot = startPoint;
        path.position = exitPoint;
        path.strokeWidth = 1 * this.roomFactor;
        path.strokeColor = this.defualtColor;
        return path;
    }

    renderLadder(room, direction) {
        this.labelsLayer.activate();
        let triangle = new paper.Path.RegularPolygon(
            new paper.Point(room.render.bounds.bottomCenter).subtract(new paper.Point(0, 0.2 * this.roomFactor)),
            3,
            0.3 * this.roomFactor
        );
        triangle.scale(1, 0.75);
        let baseColor = this.lightnessDependantColor(room);
        triangle.strokeWidth = 1 * this.roomFactor;
        triangle.fillColor = new paper.Color(baseColor, baseColor, baseColor, 0.75);
        triangle.strokeColor = new paper.Color(baseColor, baseColor, baseColor);

        triangle.bringToFront();

        if (direction === "up") {
            triangle.rotate(180, new paper.Point(room.render.bounds.center));
        }

        return triangle;
    }

    renderChar(room) {
        this.charsLayer.activate();
        if (room.roomChar) {
            let size = 0.85 * this.roomFactor;
            let x = this.pngRender ? room.render.position.x - 0.1 : room.render.position.x;
            let text = new paper.PointText(x, room.render.position.y + size / 4);
            text.fillColor = this.lightnessDependantColor(room);
            text.fontSize = size;
            text.content = room.roomChar;
            text.justification = "center";
            text.locked = true;
            text.scale(1, -1);
        }
    }

    renderDoors(firstPoint, secondPoint) {
        this.specialLinkLayer.activate();
        let x = (firstPoint.x + secondPoint.x) / 2;
        let y = (firstPoint.y + secondPoint.y) / 2;
        let door = new paper.Path.Rectangle(x - 0.5, y - 0.5, 1, 1);
        door.scale(0.2, door.center);
        door.strokeColor = "rgb(226,205,59)";
        door.strokeWidth = 1;
    }

    renderLabel(value) {
        let background = new paper.Path.Rectangle(new paper.Point(value.X, value.Y - value.Height), new paper.Size(value.Width, value.Height));
        background.fillColor = new paper.Color(value.BgColor.r / 255, value.BgColor.g / 255, value.BgColor.b / 255);
        let text = new paper.PointText(background.bounds.center.add(0, 0.04));
        text.fillColor = new paper.Color(value.FgColor.r / 255, value.FgColor.g / 255, value.FgColor.b / 255);
        text.fontSize = 0.6
        text.content = value.text;
        text.fontFamily = 'Arial'
        text.justification = "center";
        text.locked = true;
        text.scale(1, -1);
    }

    lightnessDependantColor(room) {
        if (room.render.fillColor.lightness > 0.41) {
            return 0.1;
        } else {
            return 0.9;
        }
    }

    pointerReactor(path) {
        path.onMouseEnter = (event) => (this.element.style.cursor = "pointer");
        path.onMouseLeave = (event) => (this.element.style.cursor = "default");
    }

    getXMid(x) {
        return x + this.roomFactor / 2;
    }

    getYMid(y) {
        return y + this.roomFactor / 2;
    }

    getExitX(x, dir) {
        if (this.settings.isRound) {
            return x + 0.25 * this.exitFactor;
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
                return x + 0.5 * this.exitFactor;
            default:
                return x + 0.25 * this.exitFactor;
        }
    }

    getExitY(y, dir) {
        if (this.settings.isRound) {
            return y + 0.25 * this.exitFactor;
        }
        switch (dir) {
            case "north":
            case "n":
            case "northwest":
            case "nw":
            case "northeast":
            case "ne":
                return y + 0.5 * this.exitFactor;
            case "south":
            case "s":
            case "southwest":
            case "sw":
            case "southeast":
            case "se":
                return y;
            default:
                return y + 0.25 * this.exitFactor;
        }
    }

    getRealPoint(x, y) {
        return this.matrix.transform(new paper.Point(x, y));
    }

    getBounds() {
        return this.backgroundLayer.getBounds();
    }

    renderPosition(id) {
        this.overlayLayer.activate();
        let room = this.area.getRoomById(id);
        let circle = new paper.Shape.Circle(new paper.Point(room.x + 0.25, room.y + 0.25), 0.2);
        circle.fillColor = new paper.Color(0.5, 0.1, 0.1, 1);
        circle.strokeWidth = 0.1;
        circle.strokeColor = new paper.Color(0.9, 0.9, 0.9, 1);
    }
}

module.exports = {
    Renderer: Renderer,
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
};

let plDirs = {
    north: "polnoc",
    south: "poludnie",
    east: "wschod",
    west: "zachod",
    northeast: "polnocny-wschod",
    northwest: "polnocny-zachod",
    southeast: "poludniowy-wschod",
    southwest: "poludniowy-zachod",
    up: "gora",
    down: "dol",
};

function dirsShortToLong(dir) {
    let result = getKeyByValue(dirs, dir);
    return result !== undefined ? result : dir;
}

function dirLongToShort(dir) {
    return dirs[dir] !== undefined ? dirs[dir] : dir;
}
