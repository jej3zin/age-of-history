import type { MapPosition, Territory } from "../game/types";

type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: { type: string; coordinates?: unknown } | null;
};
type GeoJsonFeatureCollection = { type: "FeatureCollection"; features: GeoJsonFeature[] };

function isFinitePosition(value: unknown): value is MapPosition {
  return Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function parseOuterRing(value: unknown, name: string, index: number): MapPosition[] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isFinitePosition)) {
    throw new Error(`Território "${name}" (feição ${index + 1}): cada polígono precisa de um anel externo com ao menos quatro posições válidas.`);
  }
  const points = value.map(position => [position[0], position[1]] as MapPosition);
  if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) {
    points.push([...points[0]]);
  }
  const openRing = points.slice(0, -1);
  let twiceArea = 0;
  for (let i = 0; i < openRing.length; i++) {
    const a = openRing[i], b = openRing[(i + 1) % openRing.length];
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }
  if (openRing.length < 3 || !Number.isFinite(twiceArea) || Math.abs(twiceArea) <= 0) {
    throw new Error(`Território "${name}" (feição ${index + 1}): polígono sem área válida.`);
  }
  return points;
}

/** Calcula o centróide geométrico de um anel fechado e sua área absoluta. */
function ringCentroid(ring: MapPosition[]): { center: MapPosition; area: number } {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    const cross = a[0] * b[1] - b[0] * a[1];
    twiceArea += cross;
    x += (a[0] + b[0]) * cross;
    y += (a[1] + b[1]) * cross;
  }
  const area = Math.abs(twiceArea / 2);
  if (Math.abs(twiceArea) < Number.EPSILON) {
    const points = ring.slice(0, -1);
    return {
      center: [
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
        points.reduce((sum, point) => sum + point[1], 0) / points.length
      ],
      area: 0
    };
  }
  return { center: [x / (3 * twiceArea), y / (3 * twiceArea)], area };
}

function polygonsCentroid(polygons: MapPosition[][]): MapPosition {
  const centroids = polygons.map(ringCentroid);
  const totalArea = centroids.reduce((sum, item) => sum + item.area, 0);
  if (totalArea <= 0) return centroids[0]?.center ?? [0, 0];
  return [
    centroids.reduce((sum, item) => sum + item.center[0] * item.area, 0) / totalArea,
    centroids.reduce((sum, item) => sum + item.center[1] * item.area, 0) / totalArea
  ];
}

/** Importa Polygon e MultiPolygon; por enquanto, usa apenas os anéis externos (sem recortes internos/holes). */
export function importTerritoriesFromGeoJSON(input: unknown, validCountryIds?: Set<string>): Territory[] {
  if (!input || typeof input !== "object") throw new Error("O arquivo do mapa deve ser um objeto GeoJSON.");
  const collection = input as Partial<GeoJsonFeatureCollection>;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features) || collection.features.length === 0) {
    throw new Error("GeoJSON inválido: esperado FeatureCollection com ao menos uma feição.");
  }

  const seenIds = new Set<string>();
  return collection.features.map((feature, index) => {
    if (!feature || feature.type !== "Feature" || !feature.geometry) {
      throw new Error(`Feição ${index + 1}: geometria ausente ou formato inválido.`);
    }
    const geometry = feature.geometry;
    let rawRings: unknown[];
    if (geometry.type === "Polygon") {
      if (!Array.isArray(geometry.coordinates)) throw new Error(`Feição ${index + 1}: coordenadas Polygon inválidas.`);
      rawRings = [geometry.coordinates[0]];
    } else if (geometry.type === "MultiPolygon") {
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
        throw new Error(`Feição ${index + 1}: MultiPolygon precisa conter ao menos um polígono.`);
      }
      rawRings = geometry.coordinates.map((polygon: unknown) => Array.isArray(polygon) ? polygon[0] : undefined);
    } else {
      throw new Error(`Feição ${index + 1}: tipo de geometria "${geometry.type}" não suportado; use Polygon ou MultiPolygon.`);
    }

    const properties = feature.properties ?? {};
    const rawId = properties.id ?? feature.id;
    const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId).trim() : "";
    const name = typeof properties.name === "string" ? properties.name.trim() : "";
    const countryId = typeof properties.countryId === "string" ? properties.countryId.trim() : "";
    if (!id || !name || !countryId) throw new Error("Feição " + (index + 1) + ": properties.id, properties.name e properties.countryId são obrigatórios.");
    if (seenIds.has(id)) throw new Error(`ID territorial duplicado: "${id}".`);
    if (validCountryIds && !validCountryIds.has(countryId)) throw new Error(`Território "${name}": countryId "${countryId}" não corresponde a nenhum país da campanha atual.`);
    seenIds.add(id);

    const polygons = rawRings.map(ring => parseOuterRing(ring, name, index));
    const center = polygonsCentroid(polygons);
    const population = Number(properties.population ?? 0);
    const production = Number(properties.production ?? 0);
    if (!Number.isFinite(population) || population < 0 || !Number.isFinite(production) || production < 0) {
      throw new Error(`Território "${name}": população e produção precisam ser números não negativos.`);
    }
    return {
      id, name, countryId, points: polygons[0], polygons, center, population, production,
      terrain: typeof properties.terrain === "string" ? properties.terrain : "Não definido",
      ...(typeof properties.regionName === "string" ? { regionName: properties.regionName } : {})
    };
  });
}
