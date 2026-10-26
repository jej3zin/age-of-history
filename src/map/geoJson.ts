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

/** Importa Polygon e MultiPolygon preservando anéis externos e buracos internos. */
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
    let rawPolygons: unknown[][];
    if (geometry.type === "Polygon") {
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
        throw new Error(`Feição ${index + 1}: coordenadas Polygon inválidas.`);
      }
      rawPolygons = [geometry.coordinates as unknown[]];
    } else if (geometry.type === "MultiPolygon") {
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0 ||
        !geometry.coordinates.every((polygon: unknown) => Array.isArray(polygon) && polygon.length > 0)) {
        throw new Error(`Feição ${index + 1}: MultiPolygon precisa conter ao menos um polígono com anel externo.`);
      }
      rawPolygons = geometry.coordinates as unknown[][][];
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

    const polygons = rawPolygons.map(rings => parseOuterRing(rings[0], name, index));
    const polygonHoles = rawPolygons.map(rings => rings.slice(1).map(ring => parseOuterRing(ring, name, index)));
    const center = polygonsCentroid(polygons);
    const population = Number(properties.population ?? 0);
    const production = Number(properties.production ?? 0);
    if (!Number.isFinite(population) || population < 0 || !Number.isFinite(production) || production < 0) {
      throw new Error(`Território "${name}": população e produção precisam ser números não negativos.`);
    }
    return {
      id, name, countryId, points: polygons[0], polygons, polygonHoles, center, population, production,
      terrain: typeof properties.terrain === "string" ? properties.terrain : "Não definido",
      ...(typeof properties.regionName === "string" ? { regionName: properties.regionName } : {})
    };
  });
}

/** Testa se um ponto pertence ao território, incluindo bordas externas e excluindo buracos internos. */
export function territoryContainsPoint(territory: Territory, point: MapPosition): boolean {
  const onSegment = (p: MapPosition, a: MapPosition, b: MapPosition) => {
    const cross = (p[1] - a[1]) * (b[0] - a[0]) - (p[0] - a[0]) * (b[1] - a[1]);
    const scale = Math.max(1, Math.abs(a[0]), Math.abs(a[1]), Math.abs(b[0]), Math.abs(b[1]));
    if (Math.abs(cross) > 1e-9 * scale) return false;
    const dot = (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]);
    return dot <= 1e-9 * scale;
  };
  const inRing = (p: MapPosition, ring: MapPosition[]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j], b = ring[i];
      if (onSegment(p, a, b)) return true;
      const crosses = (a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / ((b[1] - a[1]) || Number.EPSILON) + a[0];
      if (crosses) inside = !inside;
    }
    return inside;
  };
  const polygons = territory.polygons?.length ? territory.polygons : [territory.points];
  return polygons.some((outer, index) => {
    if (!inRing(point, outer)) return false;
    const holes = territory.polygonHoles?.[index] ?? [];
    return !holes.some(hole => inRing(point, hole));
  });
}
