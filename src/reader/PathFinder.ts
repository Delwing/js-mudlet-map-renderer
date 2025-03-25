import MapReader from "./MapReader";
import Graph from "node-dijkstra";

export default class PathFinder {
    route: Graph;

    constructor(reader: MapReader) {
        this.route = new Graph();
        reader.getAreas().forEach(area => area.rooms.forEach(room => {
            let exits = Object.values(room.exits).concat(Object.values(room.specialExits)).map(item => [item, room.weight ?? 1]);
            this.route.addNode(room.id.toString(), Object.fromEntries(exits));
        }));
    }

    path(from: number, to: number) {
        return this.route.path(from.toString(), to.toString()) as string[];
    }

}
