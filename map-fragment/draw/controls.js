const paper = require("paper")

class Controls {
    constructor(renderer, element, paper) {
        this.renderer = renderer
        this.element = element
        this.view = paper.view
        this.element.onwheel = (event) => this.zoom(event)
        this.activateDrag()
    }

    zoom(event) {
        event.preventDefault()
        let oldZoom = this.view.zoom
        if (event.deltaY > 0) {
            this.view.zoom *= 0.9
        } else {
            this.view.zoom *= 1.1
        }
        
        let viewPos = this.view.viewToProject(new paper.Point(event.x, event.y));
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
            //let bounds = that.renderer.getBounds(); //TODO prevent drag over bounds
            let delta = event.downPoint.subtract(event.point);
            this.view.scrollBy(delta);
            this.isDrag = true;
        };
        toolPan.onMouseDown = (event) => {
            this.isDrag = false;
        };
        toolPan.onMouseUp = (event) => {
            this.isDrag = false;
            this.element.style.cursor = "default";
        }
    }
}


module.exports = {
    Controls: Controls,
}