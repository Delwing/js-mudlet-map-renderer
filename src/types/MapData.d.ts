declare namespace MapData {

    export type direction =
        "north"
        | "south"
        | "east"
        | "west"
        | "northwest"
        | "northeast"
        | "southeast"
        | "southwest"
        | "up"
        | "down"
        | "in"
        | "out"

    export interface Color {
        alpha: number;
        r: number;
        g: number;
        b: number;
    }

    export interface Line {
        points: Point[];
        attributes: LineAttribute;
    }

    export interface Point {
        x: number;
        y: number;
    }

    export interface LineAttribute {
        color: Color;
        style: string;
        arrow: boolean;
    }

    export interface Room {
        id: number;
        area: number;
        x: number;
        y: number;
        z: number;
        areaId: string;
        weight: number;
        symbol: string;
        userData: Record<string, string>;
        customLines: Record<string, Line>;
        stubs: number[];
        hash: string;
        env: number;
        exits: Record<direction, number>;
        doors: Record<direction, 1 | 2 | 3>;
        specialExits: Record<string, number>;
    }

    export interface Label {
        labelId: number;
        areaId: number;
        pixMap: string;
        X: number;
        Y: number;
        Z: number;
        Width: number;
        Height: number;
        Text: string;
        FgColor: Color;
        BgColor: Color;
    }

    export interface Area {
        areaName: string;
        areaId: string;
        rooms: Room[];
        labels: Label[];
    }

    export type Map = Area[]

    export interface Env {
        envId: string;
        colors: number[];
    }

}