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
        this.areaExitPaths = new Map();
        this.areaExitRooms = new Map();
        this.exitGraph = null;
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
     * Build and cache a simplified graph that connects exits between areas.
     * Each node represents a room that connects to another area. Edges within
     * an area use the pre-calculated cost between exits.
     * @returns {Graph}
     */
    _buildExitGraph() {
        const exitRooms = new Map(); // areaId -> Set of exit room ids
        const adjacency = new Map(); // nodeId -> Map of neighbors

        this.reader.getAreas().forEach((area) =>
            area.rooms.forEach((room) => {
                const exits = Object.values(room.exits).concat(
                    Object.values(room.specialExits)
                );
                exits.forEach((destId) => {
                    const destRoom = this.reader.getRoomById(destId);
                    if (!destRoom || destRoom.areaId === room.areaId) {
                        return;
                    }
                    if (!exitRooms.has(room.areaId)) {
                        exitRooms.set(room.areaId, new Set());
                    }
                    if (!exitRooms.has(destRoom.areaId)) {
                        exitRooms.set(destRoom.areaId, new Set());
                    }
                    exitRooms.get(room.areaId).add(room.id);
                    exitRooms.get(destRoom.areaId).add(destRoom.id);

                    const weight = room.weight ?? 1;
                    const key = room.id.toString();
                    const target = destRoom.id.toString();
                    const neighbors = adjacency.get(key) ?? new Map();
                    neighbors.set(target, weight);
                    adjacency.set(key, neighbors);
                });
            })
        );

        exitRooms.forEach((set, areaId) => {
            const exits = Array.from(set).map((id) => id.toString());
            this.areaExitRooms.set(areaId, exits);
            const graph = this.areaGraphs.get(areaId) ?? this._buildAreaGraph(areaId);
            const paths = new Map();
            exits.forEach((fromId) => {
                const fromPaths = new Map();
                exits.forEach((toId) => {
                    if (fromId === toId) {
                        return;
                    }
                    const result = graph.path(fromId, toId, { cost: true });
                    if (result && result.path) {
                        fromPaths.set(toId, result);
                        const neighbors = adjacency.get(fromId) ?? new Map();
                        neighbors.set(toId, result.cost);
                        adjacency.set(fromId, neighbors);
                    }
                });
                paths.set(fromId, fromPaths);
            });
            this.areaExitPaths.set(areaId, paths);
        });

        exitRooms.forEach((set) =>
            set.forEach((id) => {
                const key = id.toString();
                if (!adjacency.has(key)) {
                    adjacency.set(key, new Map());
                }
            })
        );

        const graphData = new Map();
        adjacency.forEach((neighbors, node) => {
            graphData.set(node, new Map(neighbors));
        });
        this.exitGraph = new Graph(graphData);
        return this.exitGraph;
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
            const result = graph.path(from.toString(), to.toString());
            this.pathCache.set(cacheKey, result);
            return result;
        }

        const baseGraph = this.exitGraph ?? this._buildExitGraph();
        const graphData = new Map();
        baseGraph.graph.forEach((neighbors, node) => {
            graphData.set(node, new Map(neighbors));
        });
        graph = new Graph(graphData);

        const startNode = from.toString();
        const endNode = to.toString();

        const startArea = fromRoom?.areaId;
        const endArea = toRoom?.areaId;

        const startExits = this.areaExitRooms.get(startArea) ?? [];
        const endExits = this.areaExitRooms.get(endArea) ?? [];

        const startPaths = new Map();
        const endPaths = new Map();

        if (!startExits.includes(startNode)) {
            const areaGraph = this.areaGraphs.get(startArea) ?? this._buildAreaGraph(startArea);
            startExits.forEach((exitId) => {
                const res = areaGraph.path(startNode, exitId, { cost: true });
                if (res && res.path) {
                    startPaths.set(exitId, res);
                    const neighbors = graph.graph.get(startNode) ?? new Map();
                    neighbors.set(exitId, res.cost);
                    graph.graph.set(startNode, neighbors);
                }
            });
            graph.addNode(startNode, graph.graph.get(startNode) ?? {});
        }

        if (!endExits.includes(endNode)) {
            const areaGraph = this.areaGraphs.get(endArea) ?? this._buildAreaGraph(endArea);
            endExits.forEach((exitId) => {
                const res = areaGraph.path(exitId, endNode, { cost: true });
                if (res && res.path) {
                    endPaths.set(exitId, res);
                    const neighbors = graph.graph.get(exitId) ?? new Map();
                    neighbors.set(endNode, res.cost);
                    graph.graph.set(exitId, neighbors);
                }
            });
            graph.addNode(endNode, {});
        } else if (!graph.graph.has(endNode)) {
            graph.addNode(endNode, {});
        }

        const highLevel = graph.path(startNode, endNode);
        if (!highLevel) {
            this.pathCache.set(cacheKey, null);
            return null;
        }

        let finalPath = [];
        for (let i = 0; i < highLevel.length - 1; i++) {
            const cur = highLevel[i];
            const next = highLevel[i + 1];
            let segment;
            if (cur === startNode && startPaths.has(next)) {
                segment = startPaths.get(next).path;
            } else if (next === endNode && endPaths.has(cur)) {
                segment = endPaths.get(cur).path;
            } else {
                const curRoom = this.reader.getRoomById(parseInt(cur));
                const nextRoom = this.reader.getRoomById(parseInt(next));
                if (curRoom && nextRoom && curRoom.areaId === nextRoom.areaId) {
                    const paths = this.areaExitPaths.get(curRoom.areaId);
                    segment = paths?.get(cur)?.get(next)?.path ?? [cur, next];
                } else {
                    segment = [cur, next];
                }
            }
            if (i > 0) {
                segment = segment.slice(1);
            }
            finalPath = finalPath.concat(segment);
        }

        this.pathCache.set(cacheKey, finalPath);
        return finalPath;
    }
}

module.exports = {
    PathFinder,
};
