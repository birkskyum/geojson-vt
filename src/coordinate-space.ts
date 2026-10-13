/**
 * How the positions of the input relate to the world square the tiles cover, in which x and y run from 0 to 1.
 */
export interface CoordinateSpace {
    projectX(x: number): number;
    projectY(y: number): number;
    unprojectX(x: number): number;
    unprojectY(y: number): number;
}

/**
 * Longitude and latitude, which spherical mercator puts in the world square.
 */
class LngLatSpace implements CoordinateSpace {
    projectX(lng: number): number {
        return lng / 360 + 0.5;
    }

    projectY(lat: number): number {
        const sin = Math.sin(lat * Math.PI / 180);
        const y = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;
        return y < 0 ? 0 : y > 1 ? 1 : y;
    }

    unprojectX(x: number): number {
        return (x - 0.5) * 360;
    }

    unprojectY(y: number): number {
        const y2 = (180 - y * 360) * Math.PI / 180;
        return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
    }
}

/**
 * Positions that are world coordinates already, see `worldCoordinates` in {@link GeoJSONVTOptions}.
 */
class WorldSpace implements CoordinateSpace {
    projectX(x: number): number {
        return x;
    }

    projectY(y: number): number {
        return y;
    }

    unprojectX(x: number): number {
        return x;
    }

    unprojectY(y: number): number {
        return y;
    }
}

export const lngLatSpace: CoordinateSpace = new LngLatSpace();
const worldSpace: CoordinateSpace = new WorldSpace();

export function getCoordinateSpace(worldCoordinates?: boolean): CoordinateSpace {
    return worldCoordinates ? worldSpace : lngLatSpace;
}
