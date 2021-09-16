const paper = require("paper");

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

class Controls {
    constructor(renderer, reader, element, paperScope) {
        this.renderer = renderer;
        this.reader = reader;
        this.element = element;
        this.scope = paperScope;
        this.view = paperScope.view;
        this.element.onwheel = (event) => this.zoom(event);
        this.activateDrag();
        this.renderer.emitter.addEventListener("roomClick", (event) => this.selectRoom(event.detail));
        this.renderer.emitter.addEventListener("backgroundClick", () => this.deselectRoom());

        let bounds = this.renderer.getBounds();

        this.view.center = bounds.center;
        this.view.zoom = Math.min(this.view.size.width / bounds.width, this.view.size.height / bounds.height);
        this.view.minZoom = this.view.zoom;
    }

    zoom(event) {
        event.preventDefault();
        let oldZoom = this.view.zoom;
        this.deltaZoom(event.deltaY > 0 ? 0.9 : 1.1);
        let viewPos = this.view.viewToProject(new paper.Point(event.offsetX, event.offsetY));
        let zoomScale = oldZoom / this.view.zoom;
        let centerAdjust = viewPos.subtract(this.view.center);
        let offset = viewPos.subtract(centerAdjust.multiply(zoomScale)).subtract(this.view.center);
        this.view.center = this.view.center.add(offset);
    }

    setZoom(value) {
        this.view.zoom = value;
        this.view.zoom = Math.min(Math.max(this.view.zoom, this.view.minZoom), 50);
        this.element.dispatchEvent(new CustomEvent("zoom", { detail: this.view }));
    }

    deltaZoom(delta) {
        this.setZoom(this.view.zoom * delta);
    }

    activateDrag() {
        let toolPan = new paper.Tool();
        toolPan.activate();
        toolPan.onMouseDrag = (event) => {
            this.element.style.cursor = "all-scroll";
            let bounds = this.renderer.getBounds();
            let viewBounds = this.view.getBounds();
            if (viewBounds.x < bounds.x) {
                this.view.translate(delta);
            }
            let delta = event.downPoint.subtract(event.point);
            this.view.translate(delta.negate());
            this.isDrag = true;
        };
        toolPan.onMouseDown = () => {
            this.isDrag = false;
        };
        toolPan.onMouseUp = () => {
            this.isDrag = false;
            this.element.style.cursor = "default";
        };
    }

    selectRoom(room) {
        if(this.isDrag) {
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
        if(this.isDrag) {
            return false;
        }
        this.renderer.clearPosition();
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
            this.view.center = room.render.localToGlobal(room.render.position);
            this.selectRoom(room);
        }
    }
}

module.exports = {
    Controls: Controls,
};
