import {test, expect} from 'vitest';
import {GeoJSONVT} from '.';

test('publicly exposed cluster methods: getClusterExpansionZoom, getClusterChildren, getClusterLeaves', () => {
    const points = {
        type: 'FeatureCollection' as const,
        features: Array.from({length: 20}, (_, i) => ({
            type: 'Feature' as const,
            geometry: {type: 'Point' as const, coordinates: [i * 0.0001, i * 0.0001]},
            properties: {name: `Point ${i}`}
        }))
    };

    const index = new GeoJSONVT(points, {
        updateable: true,
        cluster: true,
        clusterOptions: {radius: 100}
    });

    const tile = index.getTile(0, 0, 0);
    const cluster = tile.features.find(f => (f.tags as {cluster?: boolean})?.cluster);
    const clusterId = (cluster.tags as {cluster_id: number}).cluster_id;

    expect(index.getClusterExpansionZoom(clusterId)).toBeGreaterThan(0);
    expect(index.getClusterChildren(clusterId).length).toBeGreaterThan(0);
    expect(index.getClusterLeaves(clusterId, 5, 0).length).toBeLessThanOrEqual(5);
});

test('publicly exposed cluster methods: return undefined when clustering is disabled', () => {
    const index = new GeoJSONVT({type: 'FeatureCollection', features: []}, {
        updateable: true,
        cluster: false,
        clusterOptions: {radius: 100}
    });

    expect(index.getClusterExpansionZoom(123)).toBeNull();
    expect(index.getClusterChildren(123)).toBeNull();
    expect(index.getClusterLeaves(123, 10, 0)).toBeNull();
});

const weightedPoints = {
    type: 'FeatureCollection' as const,
    features: [[0, 1], [0.01, 2], [100, 10], [100.01, 20]].map(([lng, weight]) => ({
        type: 'Feature' as const,
        geometry: {type: 'Point' as const, coordinates: [lng, 0]},
        properties: {weight}
    }))
};

const sumWeights = {
    map: (props: GeoJSON.GeoJsonProperties) => ({sum: (props as {weight: number}).weight}),
    reduce: (a: Record<string, unknown>, b: Record<string, unknown>) => { (a as {sum: number}).sum += (b as {sum: number}).sum; }
};

test('updateClusterOptions aggregates cluster properties when it adds a reduce function', () => {
    const index = new GeoJSONVT(weightedPoints, {
        updateable: true,
        cluster: true,
        clusterOptions: {maxZoom: 2}
    });

    index.updateClusterOptions(true, {maxZoom: 2, ...sumWeights});

    expect(index.getTile(0, 0, 0).features.map(f => (f.tags as {sum?: number}).sum)).toEqual([3, 30]);
});

test('updateClusterOptions stops aggregating cluster properties when it removes the reduce function', () => {
    const index = new GeoJSONVT(weightedPoints, {
        updateable: true,
        cluster: true,
        clusterOptions: {maxZoom: 2, ...sumWeights}
    });

    index.updateClusterOptions(true, {maxZoom: 2});

    expect(index.getTile(0, 0, 0).features.map(f => (f.tags as {sum?: number}).sum)).toEqual([undefined, undefined]);
});

test('skips an empty polygon of a MultiPolygon', () => {
    const multiPolygon = {
        type: 'MultiPolygon' as const,
        coordinates: [[[[0, 0], [10, 0], [10, 10], [0, 0]]], []]
    };

    const index = new GeoJSONVT(multiPolygon, {maxZoom: 5});

    expect(index.getTile(0, 0, 0).features[0].geometry).toEqual([[[2048, 2048], [2162, 1934], [2162, 2048], [2048, 2048]]]);
});

test('leaves out a MultiPolygon that has only empty polygons', () => {
    const multiPolygon = {
        type: 'MultiPolygon' as const,
        coordinates: [[]] as GeoJSON.Position[][][]
    };

    const index = new GeoJSONVT(multiPolygon, {updateable: true});

    expect(index.getData()).toEqual({type: 'FeatureCollection', features: []});
});
