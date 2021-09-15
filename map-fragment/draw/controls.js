const paper = require("paper");

let selectionStyle = function(room) {
    return {
        strokeColor: new paper.Color(180 / 255, 93 / 255, 60 / 255, 0.9),
        strokeWidth: 0.1,
        fillColor: new paper.Color(new paper.Gradient([[room.fillColor, 0.38], new paper.Color(1, 1, 1)], false), room.bounds.topCenter, room.bounds.bottomCenter)
    }
}

paper.Item.prototype.select = function(styleFunction) {
    this.mapSelected = !this.mapSelected;
    if (this.mapSelected) {
        let style = styleFunction(this)
        this.orgStyle = {}
        for (const key in style) {
            this.orgStyle[key] = this[key]
        }
        this.style = style;
    } else {
        console.log(this.orgStyle)
        this.style = this.orgStyle
    }
}

class Controls {
    constructor(renderer, reader, element, paperScope) {
        this.renderer = renderer;
        this.reader = reader;
        this.element = element;
        this.scope = paperScope;
        this.view = paperScope.view;
        this.element.onwheel = (event) => this.zoom(event);
        this.activateDrag();
        this.element.addEventListener("roomClick", (event) => this.selectRoom(event.detail));
        this.element.addEventListener("backgroundClick", () => this.deselectRoom());


        let bounds = this.renderer.getBounds();

        this.view.center = bounds.center;
        this.view.zoom = Math.min(this.view.size.width / bounds.width, this.view.size.height / bounds.height);
        this.view.minZoom = this.view.zoom;
    }

    zoom(event) {
        event.preventDefault();
        let oldZoom = this.view.zoom;
        if (event.deltaY > 0) {
            this.view.zoom *= 0.9;
        } else {
            this.view.zoom *= 1.1;
        }

        this.view.zoom = Math.min(Math.max(this.view.zoom, this.view.minZoom), 50);
        let viewPos = this.view.viewToProject(new paper.Point(event.offsetX, event.offsetY));
        let zoomScale = oldZoom / this.view.zoom;
        let centerAdjust = viewPos.subtract(this.view.center);
        let offset = viewPos.subtract(centerAdjust.multiply(zoomScale)).subtract(this.view.center);
        this.view.center = this.view.center.add(offset);
    }

    setZoom(value) {
        this.view.zoom = value;
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
        this.deselectRoom()
        this.renderer.renderPosition(room.id)
        room.render.select(selectionStyle)
        room.exitsRenders.forEach(render => render.select(selectionStyle));
        this.selected = room;

        this.element.dispatchEvent(new CustomEvent("roomSelected", {detail: room}))
    }

    deselectRoom() {
        if (this.selected !== undefined) {
            this.selected.render.select();
            this.selected.exitsRenders.forEach(render => render.select());
            delete this.selected
            this.element.dispatchEvent(new CustomEvent("roomDeselected"))
        }
    }

    centerRoom(id) {
        let room = this.renderer.area.getRoomById(id);
        if (room !== undefined) {
            this.view.center = room.render.position;
        }
    }

}

module.exports = {
    Controls: Controls,
};
