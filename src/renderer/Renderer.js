"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var paper_1 = require("paper");
var Controls_1 = require("./Controls");
var padding = 7;
var gridSize = 20;
var Colors = {
    OPEN_DOOR: new paper_1.default.Color(10 / 255, 155 / 255, 10 / 255),
    CLOSED_DOOR: new paper_1.default.Color(226 / 255, 205 / 255, 59 / 255),
    LOCKED_DOOR: new paper_1.default.Color(155 / 255, 10 / 255, 10 / 255),
    DEFAULT_BACKGROUND: new paper_1.default.Color(0, 0, 0),
    DEFAULT: new paper_1.default.Color(1, 1, 1)
};
var Settings = /** @class */ (function () {
    function Settings() {
        this.isRound = false;
        this.scale = 55;
        this.roomSize = 10;
        this.exitsSize = 2;
        this.borders = false;
        this.frameMode = false;
        this.areaName = true;
        this.showLabels = true;
        this.uniformLevelSize = false;
        this.fontFamily = "sans-serif";
        this.mapBackground = Colors.DEFAULT_BACKGROUND;
        this.linesColor = Colors.DEFAULT;
        this.transparentLabels = false;
        this.emboss = false;
    }
    return Settings;
}());
paper_1.default.Item.prototype.registerClick = function (callback) {
    if (typeof document !== "undefined") {
        this.onClick = callback;
    }
};
paper_1.default.Item.prototype.pointerReactor = function (element) {
    if (typeof window !== "undefined" && element instanceof HTMLCanvasElement) {
        this.onMouseEnter = function () { return (element.style.cursor = "pointer"); };
        this.onMouseLeave = function () { return (element.style.cursor = "default"); };
    }
};
var Renderer = /** @class */ (function () {
    function Renderer(element, reader, area, colors, settings) {
        this.settings = new Settings();
        Object.assign(this.settings, settings);
        this.reader = reader;
        this.area = area;
        this.colors = colors;
        this.scale = this.settings.scale;
        this.roomSize = this.settings.roomSize;
        this.roomFactor = this.roomSize / gridSize;
        this.exitFactor = this.settings.exitsSize * 0.01;
        this.roomDiagonal = this.roomFactor * Math.sqrt(2);
        this.innerExits = ["up", "down", "u", "d", "in", "out", "i", "u"];
        this.paper = new paper_1.default.PaperScope();
        this.bounds = this.area.getAreaBounds(this.settings.uniformLevelSize);
        if (element == undefined) {
            element = new paper_1.default.Size(0, 0);
            this.isVisual = false;
        }
        else {
            this.isVisual = true;
            this.emitter = new EventTarget();
        }
        this.paper.setup(element);
        this.element = element;
        this.backgroundLayer = new paper_1.default.Layer();
        this.bgLabels = new paper_1.default.Layer();
        this.linkLayer = new paper_1.default.Layer();
        this.roomLayer = new paper_1.default.Layer();
        this.rasterLayer = new paper_1.default.Layer();
        this.labelsLayer = new paper_1.default.Layer();
        this.specialLinkLayer = new paper_1.default.Layer();
        this.charsLayer = new paper_1.default.Layer();
        this.overlayLayer = new paper_1.default.Layer();
        this.exitsRendered = {};
        this.defualtColor = new paper_1.default.Color(this.colors.default[0] / 255, this.colors.default[1] / 255, this.colors.default[2] / 255);
        this.highlights = new paper_1.default.Group();
        this.highlights.locked = true;
        this.path = [];
        this.render();
    }
    Renderer.prototype.render = function (pngRender) {
        var _this = this;
        if (pngRender === void 0) { pngRender = false; }
        this.pngRender = pngRender;
        this.renderBackground(this.bounds.minX - padding, this.bounds.minY - padding, this.bounds.maxX + padding, this.bounds.maxY + padding);
        this.renderHeader(this.bounds.minX - padding / 2, this.bounds.maxY + padding / 2);
        this.area.rooms
            .filter(function (room) { return room.z === _this.area.zIndex; })
            .forEach(function (room) {
            _this.renderRoom(room);
        });
        if (this.area.labels !== undefined && this.settings.showLabels) {
            this.bgLabels.activate();
            this.area.labels
                .filter(function (label) { return label.Z === _this.area.zIndex; })
                .forEach(function (value) { return _this.renderLabel(value); }, this);
        }
        this.matrix = new paper_1.default.Matrix(1, 0, 0, -1, -this.bounds.minX + padding, this.bounds.maxY + padding).scale(this.scale, new paper_1.default.Point(this.bounds.minX, this.bounds.maxY));
        if (this.settings.optimizeDrag) {
            this.rasterLayer.activate();
            this.linkRaster = this.linkLayer.rasterize({ resolution: 2000 });
            this.roomRaster = this.roomLayer.rasterize({ resolution: 2000 });
            this.rasterLayer.visible = false;
        }
        this.transform();
        if (typeof window !== "undefined" && this.element instanceof HTMLCanvasElement) {
            this.controls = new Controls_1.default(this, this.reader, this.element, this.paper);
            this.element.dispatchEvent(new CustomEvent("renderComplete", { detail: this }));
        }
    };
    Renderer.prototype.transform = function () {
        var _this = this;
        var padding = this.scale;
        this.paper.project.layers.forEach(function (layer) {
            layer.applyMatrix = false;
            layer.matrix = new paper_1.default.Matrix(1, 0, 0, -1, -_this.bounds.minX + padding, _this.bounds.maxY + padding).scale(_this.scale, new paper_1.default.Point(_this.bounds.minX, _this.bounds.maxY));
        });
    };
    Renderer.prototype.renderBackground = function (x1, y1, x2, y2) {
        var _this = this;
        this.backgroundLayer.activate();
        var background = new paper_1.default.Path.Rectangle(new paper_1.default.Point(x1, y1), new paper_1.default.Point(x2, y2));
        background.fillColor = new paper_1.default.Color(this.settings.mapBackground);
        background.registerClick(function () { return _this.emitter.dispatchEvent(new CustomEvent("backgroundClick")); });
    };
    Renderer.prototype.renderHeader = function (x, y) {
        if (this.settings.areaName) {
            this.backgroundLayer.activate();
            var header = new paper_1.default.PointText(new paper_1.default.Point(x, y));
            header.fillColor = new paper_1.default.Color(1, 1, 1, 1);
            header.fontSize = 2.5;
            header.fontFamily = this.settings.fontFamily;
            header.content = this.area.areaName;
            header.scale(1, -1);
        }
    };
    Renderer.prototype.renderRoom = function (room) {
        var _this = this;
        var _a;
        this.roomLayer.activate();
        var roomShape;
        if (!this.settings.isRound) {
            roomShape = new paper_1.default.Path.Rectangle(new paper_1.default.Point(room.x, room.y), new paper_1.default.Size(this.roomFactor, this.roomFactor));
        }
        else {
            roomShape = new paper_1.default.Path.Circle(new paper_1.default.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2), this.roomFactor / 2);
        }
        var color = this.colors[room.env];
        if (color === undefined) {
            color = [114, 1, 0];
        }
        var roomColor = new paper_1.default.Color(color[0] / 255, color[1] / 255, color[2] / 255, 1);
        roomShape.fillColor = !this.settings.frameMode ? roomColor : new paper_1.default.Color(this.settings.mapBackground);
        roomShape.strokeWidth = this.exitFactor;
        roomShape.strokeColor = !this.settings.borders || this.settings.frameMode ? roomColor : this.settings.linesColor;
        room.render = roomShape;
        room.exitsRenders = room.exitsRenders !== undefined ? room.exitsRenders : [];
        for (var dir in room.exits) {
            if (this.innerExits.indexOf(dir) <= -1) {
                if (room.exits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dirLongToShort(dir))) {
                    this.renderLink(room, room.exits[dir], dir);
                }
            }
            else {
                this.renderInnerExit(room, dir);
            }
        }
        for (var dir in room.specialExits) {
            if (room.specialExits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dir)) {
                this.renderSpecialLink(room, room.specialExits[dir], dir);
            }
        }
        for (var dir in room.customLines) {
            this.renderCustomLine(room, dir, (_a = room.exits[dirsShortToLong(dir)]) !== null && _a !== void 0 ? _a : room.specialExits[dirsShortToLong(dir)]);
        }
        for (var dir in room.stubs) {
            this.renderStub(room, dirNumbers[room.stubs[dir]]);
        }
        if (this.settings.emboss) {
            this.overlayLayer.activate();
            var emboss = void 0;
            if (new paper_1.default.Color(this.settings.linesColor).lightness > 0.41) {
                emboss = new paper_1.default.Path([room.render.bounds.topLeft, room.render.bounds.topRight, room.render.bounds.bottomRight]);
                emboss.strokeColor = "#000000";
            }
            else {
                emboss = emboss = new paper_1.default.Path([room.render.bounds.topLeft, room.render.bounds.bottomLeft, room.render.bounds.bottomRight]);
                emboss.strokeColor = "#ffffff";
            }
            emboss.strokeWidth = this.exitFactor;
        }
        this.renderChar(room);
        if (typeof window !== "undefined" && this.element instanceof HTMLCanvasElement) {
            roomShape.pointerReactor(this.element);
            roomShape.registerClick(function () { return _this.emitter.dispatchEvent(new CustomEvent("roomClick", { detail: room })); });
        }
    };
    Renderer.prototype.renderLink = function (room, targetId, dir) {
        var _this = this;
        var exitKey = [room.id, targetId].sort().join("#");
        if (this.exitsRendered[exitKey] && room.doors[dirLongToShort(dir)] === undefined) {
            return;
        }
        this.linkLayer.activate();
        var targetRoom = this.area.getRoomById(targetId);
        var exitPoint = new paper_1.default.Point(this.getExitX(room.x, dir), this.getExitY(room.y, dir));
        var path = new paper_1.default.Path();
        var secondPoint;
        if (targetRoom) {
            var connectedDir = getKeyByValue(targetRoom.exits, room.id);
            var isOneWay = connectedDir === undefined;
            secondPoint = new paper_1.default.Point(this.getExitX(targetRoom.x, connectedDir), this.getExitY(targetRoom.y, connectedDir));
            if (!isOneWay) {
                path.moveTo(exitPoint);
                path.lineTo(secondPoint);
                path.strokeWidth = this.exitFactor;
                path.strokeColor = this.settings.linesColor;
            }
            else {
                this.renderArrow(exitPoint, secondPoint, this.settings.linesColor, [], this.exitFactor, this.settings.linesColor, true);
            }
        }
        else {
            secondPoint = new paper_1.default.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
            var color = this.colors[this.reader.getRoomById(targetId).env];
            if (color === undefined) {
                color = [114, 1, 0];
            }
            path = this.renderArrow(exitPoint, secondPoint, new paper_1.default.Color(color[0] / 255, color[1] / 255, color[2] / 255), [], this.exitFactor);
            path.rotate(180, exitPoint);
            path.scale(2);
            path.pointerReactor(this.element);
            path.registerClick(function () { return _this.emitter.dispatchEvent(new CustomEvent("areaArrowClick", { detail: targetId })); });
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
    };
    Renderer.prototype.renderSpecialLink = function (room, targetId, dir) {
        var _this = this;
        var _a;
        this.linkLayer.activate();
        var path;
        var exitPoint = new paper_1.default.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
        var targetRoom = this.area.getRoomById(targetId);
        var secondPoint;
        if (targetRoom && Object.entries(targetRoom.specialExits).filter(function (item) { return item[1] == room.id; }).filter(function (item) { return Object.keys(targetRoom.specialExits).indexOf(item[0]) != -1; }).length == 0) {
            path = new paper_1.default.Path();
            path.moveTo(exitPoint);
            var connectedDir = getKeyByValue(targetRoom.exits, room.id);
            secondPoint = new paper_1.default.Point(this.getExitX(targetRoom.x, connectedDir), this.getExitY(targetRoom.y, connectedDir));
            path.lineTo(secondPoint);
            path.strokeColor = this.settings.linesColor;
            path.strokeWidth = this.exitFactor;
        }
        else {
            secondPoint = new paper_1.default.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
            path = this.renderArrow(exitPoint, secondPoint, this.defualtColor, [], this.exitFactor);
            path.strokeColor = this.settings.linesColor;
            path.scale(1, exitPoint);
            path.rotate(180, exitPoint);
            path.registerClick(function () { return _this.emitter.dispatchEvent(new CustomEvent("areaArrowClick", { detail: targetId })); });
        }
        room.exitsRenders.push(path);
        if (targetRoom) {
            targetRoom.exitsRenders = (_a = targetRoom.exitsRenders) !== null && _a !== void 0 ? _a : [];
            targetRoom.exitsRenders.push(path);
        }
        return path;
    };
    Renderer.prototype.renderCustomLine = function (room, dir, targetId) {
        var _this = this;
        if (room.customLines[dir].points !== undefined && room.customLines[dir].points.length === 0) {
            return;
        }
        this.linkLayer.activate();
        var customLine = new paper_1.default.Group();
        var path = new paper_1.default.Path();
        var style = room.customLines[dir].attributes.style;
        if (style === "dot line") {
            path.dashArray = [0.05, 0.05];
            path.dashOffset = 0.1;
        }
        else if (style === "dash line") {
            path.dashArray = [0.4, 0.2];
        }
        else if (style === "solid line") {
        }
        else {
            console.log("Brak opisu stylu: " + style);
        }
        if (room.customLines[dir].attributes.color !== undefined) {
            var color = room.customLines[dir].attributes.color;
            path.strokeColor = new paper_1.default.Color(color.r / 255, color.g / 255, color.b / 255);
        }
        else {
            path.strokeColor = this.defualtColor;
        }
        var lastPoint = new paper_1.default.Point(room.x + this.roomFactor / 2, room.y + this.roomFactor / 2);
        path.moveTo(lastPoint);
        if (room.customLines[dir].points !== undefined) {
            var points_1 = [];
            room.customLines[dir].points.forEach(function (value) { return points_1.push(value); });
            for (var point in points_1) {
                var customPoint = points_1[point];
                var pointCoords = new paper_1.default.Point(customPoint.x + this.roomFactor / 2, customPoint.y + this.roomFactor / 2);
                lastPoint = new paper_1.default.Point(pointCoords);
                path.lineTo(lastPoint);
            }
        }
        customLine.addChild(path);
        if (room.customLines[dir].attributes.arrow && path.segments.length > 1) {
            var arrow = this.renderArrow(path.segments[path.segments.length - 2].point, path.segments[path.segments.length - 1].point, path.strokeColor, path.dashArray, this.exitFactor);
            customLine.addChild(arrow);
        }
        path.strokeWidth = this.exitFactor;
        path.orgStrokeColor = path.strokeColor;
        var targetRoom = this.area.getRoomById(targetId);
        if (!targetRoom) {
            customLine.registerClick(function () { return _this.emitter.dispatchEvent(new CustomEvent("areaArrowClick", { detail: targetId })); });
            customLine.pointerReactor(this.element);
        }
        room.exitsRenders.push(customLine);
        return customLine;
    };
    Renderer.prototype.renderArrow = function (lineStart, lineEnd, color, dashArray, strokeWidth, strokeColor, isOneWay) {
        if (isOneWay === void 0) { isOneWay = false; }
        var arrow = new paper_1.default.Path.RegularPolygon(lineEnd, 3, this.roomDiagonal / 6);
        arrow.position = arrow.position.add(arrow.bounds.topCenter.subtract(arrow.bounds.center));
        arrow.rotate(lineEnd.subtract(lineStart).angle + 90, lineEnd);
        var tailLine = new paper_1.default.Path.Line(lineStart, arrow.bounds.center);
        var path = new paper_1.default.Group([tailLine, arrow]);
        path.closed = true;
        arrow.fillColor = color;
        arrow.strokeColor = color;
        arrow.strokeWidth = this.exitFactor;
        tailLine.fillColor = strokeColor ? strokeColor : color;
        tailLine.strokeColor = strokeColor ? strokeColor : color;
        tailLine.dashArray = dashArray;
        tailLine.strokeWidth = this.exitFactor;
        if (isOneWay) {
            arrow.position = new paper_1.default.Point(lineEnd.x + (lineStart.x - lineEnd.x) / 2, lineEnd.y + (lineStart.y - lineEnd.y) / 2);
            tailLine.dashArray = [0.1, 0.1];
            path.fillColor = new paper_1.default.Color(1, 0, 0);
            arrow.scale(1.5);
        }
        else {
            tailLine.strokeWidth = strokeWidth;
        }
        return path;
    };
    Renderer.prototype.renderStub = function (room, dir) {
        this.linkLayer.activate();
        var path;
        if (this.innerExits.indexOf(dir) > -1) {
            path = this.renderInnerExit(room, dir, true);
        }
        else {
            var startPoint = new paper_1.default.Point(room.x + this.roomFactor * 0.5, room.y + this.roomFactor * 0.5);
            var exitPoint = new paper_1.default.Point(this.getExitX(room.x, dir), this.getExitY(room.y, dir));
            path = new paper_1.default.Path();
            path.moveTo(startPoint);
            path.lineTo(exitPoint);
            path.pivot = startPoint;
            path.scale(2);
            path.position = exitPoint;
            path.strokeWidth = this.exitFactor;
            path.strokeColor = this.settings.linesColor;
        }
        return path;
    };
    Renderer.prototype.renderInnerExit = function (room, direction, stub) {
        if (stub === void 0) { stub = false; }
        this.labelsLayer.activate();
        var group = new paper_1.default.Group();
        if (direction === "down" || direction == "d") {
            group.addChild(this.renderInnerTriangle(room, direction, stub));
        }
        if (direction === "up" || direction === "u") {
            group.addChild(this.renderInnerTriangle(room, direction, stub));
            group.rotate(180, room.render.bounds.center);
        }
        if (direction === "in" || direction === "i") {
            var left = this.renderInnerTriangle(room, direction, stub);
            left.rotate(90, room.render.bounds.center);
            left.scale(0.4, room.render.bounds.center);
            left.position.x -= 0.01;
            var right = this.renderInnerTriangle(room, direction, stub);
            right.scale(0.4, room.render.bounds.center);
            right.rotate(270, room.render.bounds.center);
            right.position.x += 0.01;
            group.addChild(left);
            group.addChild(right);
        }
        if (direction === "out" || direction === "o") {
            var left = this.renderInnerTriangle(room, direction, stub);
            left.rotate(270, room.render.bounds.center);
            left.scale(0.5, room.render.bounds.rightCenter);
            left.rotate(180);
            left.position.x -= 0.01;
            var right = this.renderInnerTriangle(room, direction, stub);
            right.rotate(90, room.render.bounds.center);
            right.scale(0.5, room.render.bounds.leftCenter);
            right.rotate(180);
            right.position.x += 0.01;
            group.addChild(left);
            group.addChild(right);
        }
        if (this.settings.isRound) {
            group.scale(0.8, 0.8, new paper_1.default.Point(room.render.bounds.center));
        }
        group.locked = true;
        return group;
    };
    Renderer.prototype.renderInnerTriangle = function (room, direction, stub) {
        var triangle = new paper_1.default.Path.RegularPolygon(new paper_1.default.Point(room.render.bounds.bottomCenter).subtract(new paper_1.default.Point(0, 0.2 * this.roomFactor)), 3, 0.3 * this.roomFactor);
        triangle.scale(1.2, 0.75);
        var baseColor = this.lightnessDependantColor(room);
        triangle.strokeWidth = this.exitFactor;
        if (!stub) {
            triangle.fillColor = new paper_1.default.Color(baseColor, baseColor, baseColor, 0.75);
        }
        triangle.strokeColor = new paper_1.default.Color(baseColor, baseColor, baseColor);
        var doorType = room.doors[dirsShortToLong(direction)];
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
    };
    Renderer.prototype.renderChar = function (room) {
        this.charsLayer.activate();
        if (room.roomChar) {
            var size = 0.80 * this.roomFactor / room.roomChar.length;
            var x = this.pngRender ? room.render.position.x - 0.1 : room.render.position.x;
            var text = new paper_1.default.PointText(new paper_1.default.Point(x, room.render.position.y + size / 4));
            if (!room.userData || room.userData["system.fallback_symbol_color"] === undefined) {
                text.fillColor = new paper_1.default.Color(this.lightnessDependantColor(room));
            }
            else {
                text.fillColor = room.userData["system.fallback_symbol_color"];
            }
            text.fontSize = size;
            text.content = room.roomChar;
            text.justification = "center";
            text.fontWeight = "bold";
            text.locked = true;
            text.scale(1, -1);
        }
    };
    Renderer.prototype.renderDoors = function (firstPoint, secondPoint, type) {
        this.specialLinkLayer.activate();
        var x = (firstPoint.x + secondPoint.x) / 2;
        var y = (firstPoint.y + secondPoint.y) / 2;
        var door = new paper_1.default.Path.Rectangle(new paper_1.default.Point(x - 0.5, y - 0.5), new paper_1.default.Size(1, 1));
        door.scale(this.roomFactor * 0.5);
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
    };
    Renderer.prototype.renderLabel = function (value) {
        if (value.pixMap) {
            var background = new paper_1.default.Path.Rectangle(new paper_1.default.Point(value.X, value.Y - value.Height), new paper_1.default.Size(value.Width, value.Height));
            background.fillColor = new paper_1.default.Color(1, 0, 0, 0.2);
            //TODO Not really sure how to deal with pixMap labels here so they are ok both in .svg and browser
            var label = new paper_1.default.Raster("data:image/png;base64," + value.pixMap);
            label.size.width = value.Width;
            label.size.height = value.Height;
            label.position = new paper_1.default.Point(value.X + value.Width / 2, value.Y);
            label.scale(this.roomFactor * 0.08, -this.roomFactor * 0.08);
        }
        else {
            var background = new paper_1.default.Path.Rectangle(new paper_1.default.Point(value.X, value.Y - value.Height), new paper_1.default.Size(value.Width, value.Height));
            if (!this.settings.transparentLabels) {
                background.fillColor = new paper_1.default.Color(value.BgColor.r / 255, value.BgColor.g / 255, value.BgColor.b / 255);
            }
            var text = new paper_1.default.PointText(background.bounds.center.add(new paper_1.default.Point(0, 0.15 * 8)));
            text.fillColor = new paper_1.default.Color(value.FgColor.r / 255, value.FgColor.g / 255, value.FgColor.b / 255);
            var ratio = Math.min(0.75, value.Width / (value.Text.length / 2));
            text.fontSize = 4;
            text.content = value.Text;
            text.fontFamily = this.settings.fontFamily;
            text.justification = "center";
            text.locked = true;
            text.scale(ratio / 4, -ratio / 4);
        }
    };
    Renderer.prototype.lightnessDependantColor = function (room) {
        if (room.render.fillColor.lightness > 0.41) {
            return 0.1;
        }
        else {
            return 0.9;
        }
    };
    Renderer.prototype.getXMid = function (x) {
        return x + this.roomFactor / 2;
    };
    Renderer.prototype.getYMid = function (y) {
        return y + this.roomFactor / 2;
    };
    Renderer.prototype.getExitX = function (x, dir) {
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
    };
    Renderer.prototype.getExitY = function (y, dir) {
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
    };
    Renderer.prototype.getRealPoint = function (x, y) {
        return this.matrix.transform(new paper_1.default.Point(x, y));
    };
    Renderer.prototype.getBounds = function () {
        return this.backgroundLayer.bounds;
    };
    Renderer.prototype.renderPosition = function (id, color) {
        this.clearPosition();
        this.overlayLayer.activate();
        var room = this.area.getRoomById(id);
        var circle = new paper_1.default.Shape.Circle(new paper_1.default.Point(room.x + this.roomFactor * 0.5, room.y + this.roomFactor * 0.5), this.roomDiagonal * 0.6);
        circle.fillColor = new paper_1.default.Color(0.5, 0.1, 0.1, 0.2);
        circle.strokeWidth = this.exitFactor * 5;
        circle.shadowColor = new paper_1.default.Color(1, 1, 1);
        circle.shadowBlur = 12;
        if (color === undefined) {
            color = [0, 0.9, 0.7];
        }
        circle.strokeColor = new paper_1.default.Color(color[0], color[1], color[2]);
        circle.dashArray = [0.05, 0.05];
        this.position = circle;
    };
    Renderer.prototype.clearPosition = function () {
        if (this.position !== undefined) {
            this.position.remove();
        }
    };
    Renderer.prototype.renderSelection = function (id, color) {
        this.clearSelection();
        this.overlayLayer.activate();
        var room = this.area.getRoomById(id);
        var selection = new paper_1.default.Path.Rectangle(new paper_1.default.Point(room.x - 0.05, room.y - 0.05), new paper_1.default.Size(this.roomFactor + 0.1, this.roomFactor + 0.1));
        selection.fillColor = new paper_1.default.Color(1, 1, 1, 0);
        selection.strokeWidth = this.exitFactor;
        if (color === undefined) {
            color = [0, 0.9, 0.7];
        }
        selection.strokeColor = new paper_1.default.Color(color[0], color[1], color[2]);
        this.selection = selection;
    };
    Renderer.prototype.clearSelection = function () {
        if (this.selection !== undefined) {
            this.selection.remove();
        }
    };
    Renderer.prototype.renderHighlight = function (id, color) {
        this.overlayLayer.activate();
        var room = this.area.getRoomById(id);
        var highlight = new paper_1.default.Shape.Circle(new paper_1.default.Point(room.x + this.roomFactor * 0.5, room.y + this.roomFactor * 0.5), this.roomDiagonal * 0.6);
        highlight.fillColor = new paper_1.default.Color(0.5, 0.1, 0.1, 0.2);
        highlight.strokeWidth = this.exitFactor * 4;
        highlight.shadowColor = room.render.fillColor;
        highlight.shadowBlur = 12;
        if (color === undefined) {
            color = [0.4, 0.9, 0.3];
        }
        highlight.strokeColor = new paper_1.default.Color(color[0], color[1], color[2]);
        highlight.dashArray = [0.1, 0.1];
        highlight.locked = true;
        this.highlights.addChild(highlight);
    };
    Renderer.prototype.clearHighlight = function () {
        this.highlights.removeChildren();
    };
    Renderer.prototype.renderPath = function (locations, color) {
        var _this = this;
        this.overlayLayer.activate();
        var group = new paper_1.default.Group();
        locations.forEach(function (id) {
            var room = _this.area.getRoomById(id);
            if (!room || room.z !== _this.area.zIndex) {
                return;
            }
            var startPoint = new paper_1.default.Point(room.x + _this.roomFactor * 0.5, room.y + _this.roomFactor * 0.5);
            var exits = Object.values(room.exits).concat(Object.values(room.specialExits));
            exits.forEach(function (exitRoomId) {
                if (locations.indexOf(exitRoomId) > -1) {
                    var exitRoom = _this.area.getRoomById(exitRoomId);
                    if (!exitRoom || exitRoom.z !== _this.area.zIndex) {
                        return;
                    }
                    var endPoint = new paper_1.default.Point(exitRoom.x + _this.roomFactor * 0.5, exitRoom.y + _this.roomFactor * 0.5);
                    var line = new paper_1.default.Path.Line(startPoint, endPoint);
                    line.strokeWidth = _this.exitFactor * 4;
                    if (color === undefined) {
                        color = [0.4, 0.9, 0.3];
                    }
                    _this.path.push(line);
                    group.addChild(line);
                }
            });
        });
        group.strokeColor = new paper_1.default.Color(color[0], color[1], color[2]);
        group.locked = true;
        return group;
    };
    Renderer.prototype.clearPath = function () {
        this.path.forEach(function (element) { return element.remove(); });
        this.path = [];
    };
    Renderer.prototype.clear = function () {
        this.paper.project.clear();
    };
    Renderer.prototype.exportSvg = function (roomId, padding) {
        var bounds = "content";
        if (roomId !== undefined) {
            var room = this.reader.roomIndex[roomId];
            if (room === undefined) {
                throw new Error("Room ".concat(roomId, " not found."));
            }
            bounds = new paper_1.default.Rectangle(this.getRealPoint(room.x, room.y).subtract(padding * this.scale), new paper_1.default.Size(padding * 2 * this.scale, padding * 2 * this.scale));
        }
        return this.paper.project.exportSVG({ asString: true, bounds: bounds });
    };
    return Renderer;
}());
exports.default = Renderer;
function getKeyByValue(obj, val) {
    for (var k in obj) {
        if (obj.hasOwnProperty(k) && obj[k] === val) {
            return k;
        }
    }
}
var dirs = {
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
    out: "o"
};
var dirNumbers = {
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
    12: "o"
};
function dirsShortToLong(dir) {
    var result = getKeyByValue(dirs, dir);
    return result !== undefined ? result : dir;
}
function dirLongToShort(dir) {
    return dirs[dir] !== undefined ? dirs[dir] : dir;
}
