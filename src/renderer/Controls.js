"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PathFinder_1 = require("../reader/PathFinder");
var paper_1 = require("paper");
var selectionStyle = function (item) {
    var style = new paper_1.default.Style({
        strokeColor: new paper_1.default.Color(180 / 255, 93 / 255, 60 / 255, 0.9)
    });
    if (item.closed) {
        style.fillColor = {
            // @ts-ignore
            gradient: {
                stops: [new paper_1.default.GradientStop(item.fillColor, 0.38), new paper_1.default.GradientStop(new paper_1.default.Color(1, 1, 1))],
                radial: false
            },
            origin: item.bounds.topCenter,
            destination: item.bounds.bottomCenter
        };
    }
    return style;
};
paper_1.default.Item.prototype.select = function (styleFunction) {
    this.mapSelected = !this.mapSelected;
    if (this.mapSelected && styleFunction !== undefined) {
        var style = styleFunction(this);
        this.orgStyle = {};
        for (var key in style) {
            this.orgStyle[key] = this[key];
        }
        this.style = style;
    }
    else {
        this.style = this.orgStyle;
    }
};
var Controls = /** @class */ (function () {
    function Controls(renderer, reader, element, paperScope) {
        var _this = this;
        this.renderer = renderer;
        this.reader = reader;
        this.element = element;
        this.scope = paperScope;
        this.view = paperScope.view;
        this.element.onwheel = function (event) { return _this.zoom(event); };
        this.activateDrag();
        this.renderer.emitter.addEventListener("roomClick", function (event) { return _this.selectRoom(event.detail); });
        this.renderer.emitter.addEventListener("backgroundClick", function () { return _this.deselectRoom(); });
        this.renderer.emitter.addEventListener("areaArrowClick", function (event) { return _this.goToRoomArea(event.detail); });
        var bounds = this.renderer.getBounds();
        this.view.center = bounds.center;
        this.view.zoom = Math.min(this.view.size.width / bounds.width, this.view.size.height / bounds.height);
        this.minZoom = this.view.zoom;
        this.pathFinder = new PathFinder_1.default(reader);
    }
    Controls.prototype.zoom = function (event) {
        event.preventDefault();
        var oldZoom = this.view.zoom;
        this.deltaZoom(event.deltaY > 0 ? 0.9 : 1.1);
        var viewPos = this.view.viewToProject(new paper_1.default.Point(event.offsetX, event.offsetY));
        var zoomScale = oldZoom / this.view.zoom;
        var centerAdjust = viewPos.subtract(this.view.center);
        var offset = viewPos.subtract(centerAdjust.multiply(zoomScale)).subtract(this.view.center);
        this.view.center = this.view.center.add(offset);
    };
    Controls.prototype.setZoom = function (value) {
        this.view.zoom = value;
        this.view.zoom = Math.min(Math.max(this.view.zoom, this.minZoom), 50);
        this.element.dispatchEvent(new CustomEvent("zoom", { detail: this.view }));
    };
    Controls.prototype.deltaZoom = function (delta) {
        this.setZoom(this.view.zoom * delta);
    };
    Controls.prototype.activateDrag = function () {
        var _this = this;
        var toolPan = new paper_1.default.Tool();
        toolPan.activate();
        toolPan.onMouseDrag = function (event) {
            _this.toggleOptimizedDrag(true);
            _this.element.style.cursor = "all-scroll";
            var delta = event.downPoint.subtract(event.point);
            _this.view.translate(delta.negate());
            _this.isDrag = true;
            _this.element.dispatchEvent(new CustomEvent("drag", { detail: _this.view }));
        };
        toolPan.onMouseDown = function () {
            _this.isDrag = false;
            _this.element.dispatchEvent(new CustomEvent("drag", { detail: _this.view }));
        };
        toolPan.onMouseUp = function () {
            _this.isDrag = false;
            _this.element.style.cursor = "default";
            _this.toggleOptimizedDrag(false);
        };
    };
    Controls.prototype.toggleOptimizedDrag = function (state) {
        if (!this.renderer.settings.optimizeDrag) {
            return;
        }
        if (state) {
            if (!this.isDrag) {
                this.renderer.linkLayer.visible = false;
                this.renderer.roomLayer.visible = false;
                this.renderer.rasterLayer.visible = true;
            }
        }
        else {
            this.renderer.linkLayer.visible = true;
            this.renderer.roomLayer.visible = true;
            this.renderer.rasterLayer.visible = false;
        }
    };
    Controls.prototype.selectRoom = function (room) {
        if (this.isDrag) {
            return false;
        }
        this.deselectRoom();
        this.renderer.renderPosition(room.id);
        room.render.select(selectionStyle);
        room.exitsRenders.forEach(function (render) { return render.select(selectionStyle); });
        this.selected = room;
        this.element.dispatchEvent(new CustomEvent("roomSelected", { detail: room }));
    };
    Controls.prototype.deselectRoom = function () {
        if (this.isDrag) {
            return false;
        }
        this.renderer.clearPosition();
        this.renderer.clearHighlight();
        if (this.selected !== undefined) {
            this.selected.render.select();
            this.selected.exitsRenders.forEach(function (render) { return render.select(); });
            delete this.selected;
            this.element.dispatchEvent(new CustomEvent("roomDeselected"));
        }
    };
    Controls.prototype.centerRoom = function (id) {
        var room = this.renderer.area.getRoomById(id);
        if (room !== undefined) {
            this.centerOnItem(room.render);
            this.selectRoom(room);
        }
    };
    Controls.prototype.centerOnItem = function (item) {
        this.view.center = item.localToGlobal(item.position);
    };
    Controls.prototype.goToRoomArea = function (id) {
        var destRoom = this.reader.getRoomById(id);
        this.element.dispatchEvent(new CustomEvent("goToArea", { detail: destRoom }));
    };
    Controls.prototype.move = function (x, y) {
        this.view.translate(new paper_1.default.Point(x * 50, y * 50).negate());
    };
    Controls.prototype.renderPath = function (from, to, color) {
        var _a;
        var rooms = (_a = this.pathFinder.path(from, to)) === null || _a === void 0 ? void 0 : _a.map(function (number) { return parseInt(number); });
        if (rooms) {
            return this.renderer.renderPath(rooms, color);
        }
    };
    return Controls;
}());
exports.default = Controls;
