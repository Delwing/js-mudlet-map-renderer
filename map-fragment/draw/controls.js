const paper = require("paper");

class Controls {
    constructor(renderer, element, paperScope) {
        this.renderer = renderer;
        this.element = element;
        this.scope = paperScope;
        this.view = paperScope.view;
        this.element.onwheel = (event) => this.zoom(event);
        this.activateDrag();
    }

    zoom(event) {
        console.log(event);
        event.preventDefault();
        let oldZoom = this.view.zoom;
        if (event.deltaY > 0) {
            this.view.zoom *= 0.9;
        } else {
            this.view.zoom *= 1.1;
        }

        let viewPos = this.view.viewToProject(new paper.Point(event.offsetX, event.offsetY));
        let zoomScale = oldZoom / this.view.zoom;
        let centerAdjust = viewPos.subtract(this.view.center);
        let offset = viewPos.subtract(centerAdjust.multiply(zoomScale)).subtract(this.view.center);
        this.view.center = this.view.center.add(offset);
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
        toolPan.onMouseDown = (event) => {
            this.isDrag = false;
        };
        toolPan.onMouseUp = (event) => {
            this.isDrag = false;
            this.element.style.cursor = "default";
        };
    }
}

module.exports = {
    Controls: Controls,
};
