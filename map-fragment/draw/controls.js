import paper from "paper";

let selectionStyle = function (item) {
    let style = {
        strokeColor: new paper.Color(180 / 255, 93 / 255, 60 / 255, 0.9),
    };
    if (item.closed) {
        style.fillColor = new paper.Color(
            new paper.Gradient([[item.fillColor, 0.38], new paper.Color(1, 1, 1)], false),
            item.bounds.topCenter,
            item.bounds.bottomCenter
        );
    }
    return style;
};

paper.Item.prototype.select = function (styleFunction) {
    this.mapSelected = !this.mapSelected;
    if (this.mapSelected && styleFunction !== undefined) {
        let style = styleFunction(this);
        this.orgStyle = {};
        for (const key in style) {
            this.orgStyle[key] = this[key];
        }
        this.style = style;
    } else {
        this.style = this.orgStyle;
    }
};

export default class Controls {
    constructor(renderer, reader, element) {
        this.renderer = renderer;
        this.reader = reader;
        this.element = element;
        this.element.onwheel = (event) => this.zoom(event);
        this.renderer.emitter.addEventListener("roomClick", (event) => this.selectRoom(event.detail));
        this.renderer.emitter.addEventListener("backgroundClick", () => this.deselectRoom());
        this.renderer.emitter.addEventListener("areaArrowClick", (event) => this.goToRoomArea(event.detail));
        console.log("map controls created")
    }

    recalculate() {
        let bounds = this.renderer.getBounds();

        this.renderer.paper.view.center = bounds.center;
        this.renderer.paper.view.zoom = Math.min(this.renderer.paper.view.size.width / bounds.width, this.renderer.paper.view.size.height / bounds.height);
        this.renderer.paper.view.minZoom = this.renderer.paper.view.zoom;
        this.activateDrag()
    }

    zoom(event) {
        event.preventDefault();
        let oldZoom = this.renderer.paper.view.zoom;
        this.deltaZoom(event.deltaY > 0 ? 0.9 : 1.1);
        let viewPos = this.renderer.paper.view.viewToProject(new paper.Point(event.offsetX, event.offsetY));
        let zoomScale = oldZoom / this.renderer.paper.view.zoom;
        let centerAdjust = viewPos.subtract(this.renderer.paper.view.center);
        let offset = viewPos.subtract(centerAdjust.multiply(zoomScale)).subtract(this.renderer.paper.view.center);
        this.renderer.paper.view.center = this.renderer.paper.view.center.add(offset);
    }

    setZoom(value) {
        this.renderer.paper.view.zoom = value;
        this.renderer.paper.view.zoom = Math.min(Math.max(this.renderer.paper.view.zoom, this.renderer.paper.view.minZoom), 50);
        this.element.dispatchEvent(new CustomEvent("zoom", { detail: this.renderer.view }));
    }

    deltaZoom(delta) {
        this.setZoom(this.renderer.paper.view.zoom * delta);
    }

    activateDrag() {
        let toolPan = new paper.Tool();
        toolPan.activate();
        toolPan.onMouseDrag = (event) => {
            this.toggleOptimizedDrag(true);
            this.element.style.cursor = "all-scroll";
            let delta = event.downPoint.subtract(event.point);
            this.renderer.paper.view.translate(delta.negate());
            this.isDrag = true;
            this.element.dispatchEvent(new CustomEvent("drag", { detail: this.renderer.view }));
        };
        toolPan.onMouseDown = () => {
            this.isDrag = false;
            this.element.dispatchEvent(new CustomEvent("drag", { detail: this.renderer.view }));
        };
        toolPan.onMouseUp = () => {
            this.isDrag = false;
            this.element.style.cursor = "default";
            this.toggleOptimizedDrag(false);
        };
    }

    toggleOptimizedDrag(state) {
        if (!this.renderer.settings.optimizeDrag) {
            return;
        }
        if (state) {
            if (!this.isDrag) {
                this.renderer.linkLayer.visible = false;
                this.renderer.roomLayer.visible = false;
                this.renderer.rasterLayer.visible = true;
            }
        } else {
            this.renderer.linkLayer.visible = true;
            this.renderer.roomLayer.visible = true;
            this.renderer.rasterLayer.visible = false;
        }
    }

    selectRoom(room) {
        if (this.isDrag) {
            return false;
        }
        this.deselectRoom();
        this.renderer.renderPosition(room.id);
        room.render.select(selectionStyle);
        room.exitsRenders.forEach((render) => render.select(selectionStyle));
        this.selected = room;

        this.element.dispatchEvent(new CustomEvent("roomSelected", { detail: room }));
    }

    deselectRoom() {
        if (this.isDrag) {
            return false;
        }
        this.renderer.clearPosition();
        this.renderer.clearHighlight();
        if (this.selected !== undefined) {
            this.selected.render.select();
            this.selected.exitsRenders.forEach((render) => render.select());
            delete this.selected;
            this.element.dispatchEvent(new CustomEvent("roomDeselected"));
        }
    }

    centerRoom(id) {
        let room = this.renderer.area.getRoomById(id);
        if (room !== undefined) {
            this.centerOnItem(room.render);
            this.selectRoom(room);
        }
    }

    centerOnItem(item) {
        this.renderer.paper.view.center = item.localToGlobal(item.position);
    }

    goToRoomArea(id) {
        let destRoom = this.reader.getRoomById(id);
        this.element.dispatchEvent(new CustomEvent("goToArea", { detail: destRoom }));
    }

    move(x, y) {
        this.renderer.paper.view.translate(new paper.Point(x * 50, y * 50).negate());
    }

    renderPath(from, to, color) {
        let rooms = this.reader.pathFinder.path(from, to)?.map(number => parseInt(number));
        console.log(rooms);
        if (rooms) {
            return this.renderer.renderPath(rooms, color);
        }
    }
}
