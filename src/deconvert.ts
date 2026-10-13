import {lngLatSpace, type CoordinateSpace} from './coordinate-space';
import type {GeoJSONVTInternalFeature} from './definitions';

/**
 * Converts internal source features back to GeoJSON format.
 */
export function convertToGeoJSON(source: GeoJSONVTInternalFeature[], space: CoordinateSpace = lngLatSpace): GeoJSON.GeoJSON {
    const geojson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: source.map(feature => featureToGeoJSON(feature, space))
    };

    return geojson;
}

/**
 * Converts a single internal feature to GeoJSON format.
 */
export function featureToGeoJSON(feature: GeoJSONVTInternalFeature, space: CoordinateSpace = lngLatSpace): GeoJSON.Feature {
    const geojsonFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: geometryToGeoJSON(feature, space),
        properties: feature.tags
    };
    if (feature.id != null) {
        geojsonFeature.id = feature.id;
    }

    return geojsonFeature;
}

/**
 * Converts a single internal feature geometry to GeoJSON format.
 */
function geometryToGeoJSON(feature: GeoJSONVTInternalFeature, space: CoordinateSpace): GeoJSON.Geometry {
    const {type, geometry} = feature;

    switch (type) {
        case 'Point':
            return {
                type: type,
                coordinates: unprojectPoint(geometry[0], geometry[1], space)
            };
        case 'MultiPoint':
            return {
                type: type,
                coordinates: unprojectPoints(geometry, space)
            };
        case 'LineString':
            return {
                type: type,
                coordinates: unprojectPoints(geometry.points, space)
            };
        case 'MultiLineString':
        case 'Polygon':
            return {
                type: type,
                coordinates: geometry.map(ring => unprojectPoints(ring.points, space))
            };
        case 'MultiPolygon':
            return {
                type: type,
                coordinates: geometry.map(polygon =>
                    polygon.map(ring => unprojectPoints(ring.points, space))
                )
            };
    }
}

export function unprojectPoints(coords: number[] | Float64Array, space: CoordinateSpace = lngLatSpace): GeoJSON.Position[] {
    const result: GeoJSON.Position[] = [];

    for (let i = 0; i < coords.length; i += 3) {
        result.push(unprojectPoint(coords[i], coords[i + 1], space));
    }

    return result;
}

function unprojectPoint(x: number, y: number, space: CoordinateSpace): GeoJSON.Position {
    return [space.unprojectX(x), space.unprojectY(y)];
}
