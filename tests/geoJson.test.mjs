import test from "node:test";
import assert from "node:assert/strict";
import { importTerritoriesFromGeoJSON, territoryContainsPoint } from "../src/map/geoJson.ts";

const polygon = (id = "t1", coordinates = [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]], properties = {}) => ({
  type: "Feature",
  properties: { id, name: "Território", countryId: "c1", ...properties },
  geometry: { type: "Polygon", coordinates },
});
const collection = (...features) => ({ type: "FeatureCollection", features });

test("imports a valid polygon and closes its ring", () => {
  const [territory] = importTerritoriesFromGeoJSON(collection(polygon("t1", [[[0, 0], [4, 0], [4, 4], [0, 4]]])), new Set(["c1"]));
  assert.equal(territory.id, "t1");
  assert.deepEqual(territory.points[0], territory.points.at(-1));
  assert.deepEqual(territory.center, [2, 2]);
  assert.equal(territory.polygons.length, 1);
});

test("calculates an area-weighted center for MultiPolygon islands", () => {
  const feature = {
    type: "Feature",
    properties: { id: "islands", name: "Ilhas", countryId: "c1" },
    geometry: { type: "MultiPolygon", coordinates: [
      [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      [[[10, 0], [14, 0], [14, 4], [10, 4], [10, 0]]],
    ] },
  };
  const [territory] = importTerritoriesFromGeoJSON(collection(feature), new Set(["c1"]));
  assert.equal(territory.polygons.length, 2);
  assert.ok(Math.abs(territory.center[0] - 9.8) < 1e-9);
  assert.ok(Math.abs(territory.center[1] - 1.8) < 1e-9);
});

test("rejects unsupported geometry types", () => {
  const feature = { ...polygon(), geometry: { type: "Point", coordinates: [1, 2] } };
  assert.throws(() => importTerritoriesFromGeoJSON(collection(feature)), /não suportado/);
});

test("rejects duplicate territory IDs", () => {
  assert.throws(() => importTerritoriesFromGeoJSON(collection(polygon("same"), polygon("same"))), /duplicado/);
});

test("rejects territories referencing an unknown country", () => {
  assert.throws(() => importTerritoriesFromGeoJSON(collection(polygon()), new Set(["other"])), /não corresponde/);
});

test("rejects rings with no area", () => {
  const feature = polygon("flat", [[[0, 0], [1, 1], [2, 2], [0, 0]]]);
  assert.throws(() => importTerritoriesFromGeoJSON(collection(feature)), /sem área válida/);
});

test("rejects negative population and production", () => {
  assert.throws(() => importTerritoriesFromGeoJSON(collection(polygon("bad", undefined, { population: -1 }))), /não negativos/);
  assert.throws(() => importTerritoriesFromGeoJSON(collection(polygon("bad", undefined, { production: -1 }))), /não negativos/);
});

test("preserves internal holes in Polygon and MultiPolygon", () => {
  const feature = polygon("with-hole", [
    [[0, 0], [8, 0], [8, 8], [0, 8], [0, 0]],
    [[2, 2], [2, 4], [4, 4], [4, 2], [2, 2]],
  ]);
  const [territory] = importTerritoriesFromGeoJSON(collection(feature), new Set(["c1"]));
  assert.equal(territory.polygons.length, 1);
  assert.equal(territory.polygonHoles.length, 1);
  assert.equal(territory.polygonHoles[0].length, 1);
  assert.deepEqual(territory.polygonHoles[0][0][0], [2, 2]);
});

test("rejects malformed internal rings", () => {
  const feature = polygon("bad-hole", [
    [[0, 0], [8, 0], [8, 8], [0, 8], [0, 0]],
    [[2, 2], [3, 3], [4, 4], [2, 2]],
  ]);
  assert.throws(() => importTerritoriesFromGeoJSON(collection(feature)), /sem área válida/);
});


test("selects territorial interiors and outer borders but excludes internal holes", () => {
  const territory = importTerritoriesFromGeoJSON(collection(polygon("t1", [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
  ])), new Set(["c1"]))[0];
  assert.equal(territoryContainsPoint(territory, [2, 2]), true);
  assert.equal(territoryContainsPoint(territory, [0, 5]), true, "outer border should remain selectable");
  assert.equal(territoryContainsPoint(territory, [12, 5]), false);
  assert.equal(territoryContainsPoint(territory, [5, 5]), false, "hole interior must not select the territory");
  assert.equal(territoryContainsPoint(territory, [3, 5]), false, "hole border must not select the territory");
});
