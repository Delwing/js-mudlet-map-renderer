const { MapReader } = require("./MapReader");
const Graph = require("node-dijkstra")

class PathFinder {

    /**
     * 
     * @param {MapReader} reader 
     */
    constructor(reader) {
        this.route = new Graph();
        reader.getAreas().forEach(area => area.rooms.forEach(room => {
            let exits = Object.values(room.exits).concat(Object.values(room.specialExits)).map(item => [item, 1]);
            this.route.addNode(room.id.toString(), Object.fromEntries(exits))
        }))
    }

    path(from, to) {
        return this.route.path(from.toString(), to.toString())
    }

}

module.exports = {
    PathFinder
}