const { MapReader } = require("./MapReader");
const Graph = require("node-dijkstra");

class PathFinder {
    /**
     * @param {MapReader} reader
     */
    constructor(reader) {
        this.reader = reader;
        this.areaGraphs = new Map();
        this.pathCache = new Map();
    }

    /**
     * Build and cache a graph for a specific area.
     * @param {number} areaId
     * @returns {Graph}
     */
    _buildAreaGraph(areaId) {
        const graph = new Graph();
        const area = this.reader.getAreaProperties(areaId);
        if (area?.rooms) {
            area.rooms.forEach((room) => {
                const exits = Object.values(room.exits)
                    .concat(Object.values(room.specialExits))
                    .map((id) => [id, room.weight ?? 1]);
                graph.addNode(room.id.toString(), Object.fromEntries(exits));
            });
        }
        this.areaGraphs.set(areaId, graph);
        return graph;
    }

    /**
     * Lazily build a graph for the whole map.
     * @returns {Graph}
     */
    _buildGlobalGraph() {
        const graph = new Graph();
        this.reader.getAreas().forEach((area) =>
            area.rooms.forEach((room) => {
                const exits = Object.values(room.exits)
                    .concat(Object.values(room.specialExits))
                    .map((id) => [id, room.weight ?? 1]);
                graph.addNode(room.id.toString(), Object.fromEntries(exits));
            })
        );
        this.globalGraph = graph;
        return graph;
    }

    /**
     * Find a path between two rooms. Results are cached.
     * @param {number} from
     * @param {number} to
     * @returns {Array<string>|null}
     */
    path(from, to) {
        const cacheKey = `${from}-${to}`;
        if (this.pathCache.has(cacheKey)) {
            return this.pathCache.get(cacheKey);
        }

        const fromRoom = this.reader.getRoomById(from);
        const toRoom = this.reader.getRoomById(to);

        let graph;
        if (fromRoom && toRoom && fromRoom.areaId === toRoom.areaId) {
            const areaId = fromRoom.areaId;
            graph = this.areaGraphs.get(areaId) ?? this._buildAreaGraph(areaId);
        } else {
            graph = this.globalGraph ?? this._buildGlobalGraph();
        }

        const result = graph.path(from.toString(), to.toString());
        this.pathCache.set(cacheKey, result);
        return result;
    }
}

module.exports = {
    PathFinder,
};
