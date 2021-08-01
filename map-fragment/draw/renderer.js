let MapReader = require("../reader/MapReader").MapReader

const paper = require('paper')

const padding = 1

class Renderer {
    constructor(element, area, colors, scale = 55,  gridSize = 10, roomSize = 5) {
        this.area = area;
        this.colors = colors
        this.scale = scale
        this.baseSize = gridSize = gridSize
        this.roomSize = roomSize = roomSize
        this.roomFactor = roomSize / gridSize
        this.exitFactor = this.roomFactor * 2
        this.ladders = ["up", "down"];
        this.paper = paper
        if (element == undefined) {
            let bounds = this.area.getAreaBounds()
            element = new paper.Size((bounds.width + padding * 2) * scale, (bounds.height + padding * 2) * scale)
        }
        paper.setup(element);
        this.element = element
        this.backgroundLayer = new paper.Layer();
        this.linkLayer = new paper.Layer();
        this.roomLayer = new paper.Layer();
        this.labelsLayer = new paper.Layer();
        this.specialLinkLayer = new paper.Layer();
        this.charsLayer = new paper.Layer();
        this.exitsRendered = {}
        this.isVisual = paper.view.element !== null
        this.defualtColor = new paper.Color(this.colors.default[0] / 255, this.colors.default[1] / 255, this.colors.default[2] / 255);
    }


    render(pngRender = false) {
        this.pngRender = pngRender
        let bounds = this.area.getAreaBounds()
        let padding = 1 * this.scale
        this.drawBackground(bounds.minX - padding, bounds.minY - padding, bounds.maxX + padding, bounds.maxY + padding)
        this.area.rooms.forEach(value => {
            this.renderRoom(value)
        });
        //TODO Setting for area labels
        if (this.area.labels !== undefined) {
            this.area.labels.forEach(value => this.renderLabel(value), this);
        }
        this.matrix = new paper.Matrix(1, 0, 0, -1, -bounds.minX + padding, bounds.maxY + padding).scale(this.scale, new paper.Point(bounds.minX, bounds.maxY))
    }

    transform() {
        let bounds = this.area.getAreaBounds()
        let padding = 1 * this.scale
        paper.project.layers.forEach(layer => {
            layer.transform(new paper.Matrix(1, 0, 0, -1, -bounds.minX + padding, bounds.maxY + padding).scale(this.scale, new paper.Point(bounds.minX, bounds.maxY)));
        });
    }
    
    drawBackground(x1, y1, x2, y2) {
        this.backgroundLayer.activate();
        let background = new paper.Path.Rectangle(new paper.Point(x1, y1), new paper.Point(x2, y2));
        background.fillColor = new paper.Color(0, 0, 0);
    }

    renderRoom(room) {
        this.roomLayer.activate()
        let roomShape = new paper.Path.Rectangle(room.x, room.y, this.roomFactor, this.roomFactor);
        let color = this.colors[room.env]
        if (color === undefined) {
            color = [114, 1, 0];
        }
        roomShape.fillColor = new paper.Color(color[0] / 255, color[1] / 255, color[2] / 255, 1);

        room.render = roomShape

        for (let dir in room.exits) {
            if (this.ladders.indexOf(dir) <= -1) {
                if (room.exits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dirLongToShort(dir))) {
                    this.renderLink(room, room.exits[dir], dir)
                }
            } else {
                this.renderLadder(room, dir)
            }
        }

        for (let dir in room.specialExits) {
            if (room.specialExits.hasOwnProperty(dir) && !room.customLines.hasOwnProperty(dir)) {
                this.renderSpecialLink(room, dir, room.specialExits[dir])
            }
        }

        for (let dir in room.customLines) {
            this.renderCustomLine(room, dir);
        }

        for (let dir in room.stubs) {
           this.renderStub(room, dirNumbers[room.stubs[dir]])
        }
        
        this.renderChar(room);
        
        if (this.isVisual) {
            this.pointerReactor(roomShape)
            roomShape.onClick = () => {
                console.log(room)
            }
        }

    }

    renderLink(room, targetId, dir) {
        let exitKey = new Array(room.id, targetId).sort().concat(dir).join("#")
        if (this.exitsRendered[exitKey]) {
            return
        }
        this.linkLayer.activate()
        let targetRoom = this.area.getRoomById(targetId)
        let exitPoint = new paper.Point(this.getExitX(room.x, dir), this.getExitY(room.y, dir));
        let path = new paper.Path();
        let secondPoint
        if (targetRoom) {
            let connectedDir = getKeyByValue(targetRoom.exits, room.id)
            secondPoint = new paper.Point(this.getExitX(targetRoom.x, connectedDir), this.getExitY(targetRoom.y, connectedDir))
            path.moveTo(exitPoint);
            path.lineTo(secondPoint);
            path.strokeWidth = 1 * this.roomFactor;
            path.strokeColor = this.defualtColor
        } else {
            secondPoint = new paper.Point(room.x + 0.25, room.y + 0.25);
            // let roomProperties = roomIndex[exit];            
            let color = this.colors[room.env];
            if (color === undefined) {
                color = [114, 1, 0];
            }
            path = this.drawArrow(exitPoint, secondPoint, new paper.Color(color[0] / 255, color[1] / 255, color[2] / 255), [], 1);
            path.rotate(180, exitPoint)

        }

        if (room.doors[dirLongToShort(dir)] !== undefined) {
            this.renderDoors(exitPoint, secondPoint)
        }

        this.exitsRendered[exitKey] = true
    }

    renderSpecialLink(room, targetId, dir) {
        this.linkLayer.activate();
       
        let path;
        let exitPoint = new paper.Point(room.x + 0.25, room.y + 0.25);
        let room2 = this.area.getRoomById(targetId)
        let secondPoint;

        if (room2) {
            path = new paper.Path();
            path.moveTo(exitPoint);
            let connectedDir = getKeyByValue(room2.exits, room1.id);
            secondPoint = new paper.Point(this.getExitX(room2.x, connectedDir), this.getExitY(room2.y, connectedDir));
            path.lineTo(secondPoint);

            path.strokeWidth = 1;
        } else {
            secondPoint = new paper.Point(room.x + 0.25, room.y + 0.25);
            path = this.drawArrow(exitPoint, secondPoint, this.defualtColor, [], 1);
            path.strokeColor = this.defualtColor;
            path.scale(1, exitPoint);
            path.rotate(180, exitPoint);
        }

        if (room.doors[dirLongToShort(dir)] !== undefined) {
            this.renderDoors(exitPoint, secondPoint)
        }

        return path;   
    }

    renderCustomLine(room, dir) {
        if (room.customLines[dir].points !== undefined && room.customLines[dir].points.length === 0) {
            return
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
        let lastPoint = new paper.Point(room.x + 0.25, room.y + 0.25);
        path.moveTo(lastPoint);


        if (room.customLines[dir].points !== undefined) {
            let points = [];

            room.customLines[dir].points.forEach(value => points.push(value));

            for (let point in points) {
                let customPoint = points[point];
                let pointCoords = new paper.Point(customPoint.x + 0.25, customPoint.y + 0.25);

                lastPoint = new paper.Point(pointCoords);
                path.lineTo(lastPoint);
            }
        }

        customLine.addChild(path);

        if (room.customLines[dir].attributes.arrow && path.segments.length > 1) {
            let arrow = this.drawArrow(path.segments[path.segments.length - 2].point, path.segments[path.segments.length - 1].point, path.strokeColor, path.dashArray, this.exitFactor);
            customLine.addChild(arrow);
        }

        path.orgStrokeColor = path.strokeColor;

        return path;

    }

    drawArrow(exitPoint, secondPoint, color, dashArray, strokeWidth, strokeColor, isOneWay) {
        let lineStart = new paper.Point(exitPoint.x, exitPoint.y);
        let lineEnd = new paper.Point(secondPoint.x, secondPoint.y);

        let tailLine = new paper.Path.Line(lineStart, lineEnd);
        let arrowPoint = new paper.Point(lineEnd.x, lineEnd.y)
        let arrow = new paper.Path.RegularPolygon(arrowPoint, 3, 0.10);
        arrow.scale(1.2, 1.2, arrowPoint)
        arrow.position = arrow.position.subtract(arrow.bounds.topCenter.subtract(arrow.bounds.center))
        arrow.rotate(lineEnd.subtract(lineStart).getAngle() + 90, lineEnd)

        let path = new paper.Group([
            tailLine,
            arrow
        ]);
        path.closed = true;
        arrow.fillColor = color;
        arrow.strokeColor = color;
        tailLine.fillColor = strokeColor ? strokeColor : color;
        tailLine.strokeColor = strokeColor ? strokeColor : color;
        tailLine.dashArray = dashArray;

        if (isOneWay) {
            arrow.position = new paper.Point(lineStart.x + (lineEnd.x - lineStart.x), lineStart.y + (lineEnd.y - lineStart.y));
            tailLine.dashArray = [1, 1];
            arrow.fillColor = 'red'
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
        path.strokeColor = this.defualtColor
        return path
    }

    renderLadder(room, direction) {
        this.labelsLayer.activate();
        
        let triangle = new paper.Path.RegularPolygon(new paper.Point(room.x + 0.25, room.y + 0.40), 3, 0.15);
        triangle.scale(1, 0.75)
        let baseColor = this.lightnessDependantColor(room);

        triangle.fillColor = new paper.Color(baseColor, baseColor, baseColor, 0.75);
        triangle.strokeColor = new paper.Color(baseColor, baseColor, baseColor);

        triangle.bringToFront();

        if (direction === "up") {
            triangle.rotate(180, new paper.Point(room.x + 0.25, room.y + 0.25));
        }

        return triangle;
    }

    renderChar(room) {
        this.charsLayer.activate();
        if (room.roomChar) {
            let size = 0.35;
            let text = new paper.PointText(room.x + (this.pngRender ? 0.145 : 0.25), room.y + 0.25 + (0.25 * size));
            text.fillColor = this.lightnessDependantColor(room);
            text.fontSize = size;
            text.content = room.roomChar;
            text.justification = 'center';
            text.locked = true;
            text.scale(1, -1)
        }
    }

    renderDoors(firstPoint, secondPoint) {
        this.specialLinkLayer.activate();
        let x = (firstPoint.x + secondPoint.x) / 2;
        let y = (firstPoint.y + secondPoint.y) / 2;
        let door = new paper.Path.Rectangle(x - 0.5, y - 0.5, 1, 1);
        door.scale(0.20, door.center)
        door.strokeColor = 'rgb(226,205,59)';
        door.strokeWidth = 1;
    }

    renderLabel(value) {
        this.labelsLayer.activate();
        if (value.Pixmap) {
            let label = new paper.Raster("data:image/png;base64," + value.Pixmap);
            label.position = new paper.Point(value.X + value.Width / 2, value.Y);
            label.scale(value.Width / label._size.width, -value.Height / label._size.height);
        }
    }
    
    lightnessDependantColor(room) {
        if (room.render.fillColor.lightness > 0.41) {
            return 0.10;
        } else {
            return 0.90;
        }
    }

    pointerReactor(path) {
        path.onMouseEnter = event => this.element.style.cursor = "pointer";
        path.onMouseLeave = event => this.element.style.cursor = "default";
    }

    getXMid(x) {
        return x + 0.25
    }

    getYMid(y) {
        return y + 0.25
    }

    getExitX(x, dir) {
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
                return x + (0.5 * this.exitFactor);
            default:
                return x + (0.25 * this.exitFactor);
        }
    }

    getExitY(y, dir) {
        switch (dir) {
            case "north":
            case "n":
            case "northwest":
            case "nw":
            case "northeast":
            case "ne":
                return y + (0.5 * this.exitFactor);
            case "south":
            case "s":
            case "southwest":
            case "sw":
            case "southeast":
            case "se":
                return y;
            default:
                return y + (0.25 * this.exitFactor);
        }
    }

    getRealPoint(x ,y) {
        return this.matrix.transform(new paper.Point(x, y))
    }

    renderPosition(id) {
        this.charsLayer.activate()
        let room = this.area.getRoomById(id)
        let circle = new paper.Shape.Circle(new paper.Point(room.x + 0.25, room.y + 0.25), 0.20)
        circle.fillColor = new paper.Color(0.5, 0.1, 0.1, 1)
        circle.strokeWidth = 0.1
        circle.strokeColor = new paper.Color(0.9, 0.9, 0.9, 1)
    }

}

module.exports = {
    Renderer : Renderer
}

function getKeyByValue(obj, val) {
    for (let k in obj) {
        if (obj.hasOwnProperty(k) && obj[k] === val) {
            return k;
        }
    }
}

let dirs = {
    "north": "n",
    "south": "s",
    "east": "e",
    "west": "w",
    "northeast": "ne",
    "northwest": "nw",
    "southeast": "se",
    "southwest": "sw",
    "up": "u",
    "down": "d",
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
    "north": "polnoc",
    "south": "poludnie",
    "east": "wschod",
    "west": "zachod",
    "northeast": "polnocny-wschod",
    "northwest": "polnocny-zachod",
    "southeast": "poludniowy-wschod",
    "southwest": "poludniowy-zachod",
    "up": "gora",
    "down": "dol",
};

function dirsShortToLong(dir) {
    let result = getKeyByValue(dirs, dir);
    return result !== undefined ? result : dir;
}

function dirLongToShort(dir) {
    return dirs[dir] !== undefined ? dirs[dir] : dir;
}