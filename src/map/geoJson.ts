import type { Territory } from "../game/types";

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};
type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: GeoJsonPolygon | null;
};
type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

function isFinitePosition(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function polygonArea(points: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area / 2);
}

/** Validates and converts a GeoJSON FeatureCollection into the game's territory format.
 * Current prototype intentionally supports Polygon outer rings; MultiPolygon/island geometry
 * is rejected instead of silently drawing an incomplete territory.
 */
export function importTerritoriesFromGeoJSON(input: unknown): Territory[] {
  if (!input || typeof input !== "object") throw new Error("O arquivo do mapa deve ser um objeto GeoJSON.");
  const collection = input as Partial<GeoJsonFeatureCollection>;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("GeoJSON inválido: esperado FeatureCollection com uma lista features.");
  }

  const seenIds = new Set<string>();
  return collection.features.map((feature, index) => {
    if (!feature || feature.type !== "Feature" || !feature.geometry) {
      throw new Error(`Feição ${index + 1}: geometria ausente ou formato inválido.`);
    }
    if (feature.geometry.type !== "Polygon") {
      throw new Error(`Feição ${index + 1}: apenas geometria Polygon é suportada nesta versão; MultiPolygon/ilhas ainda não são aceitos.`);
    }

    const properties = feature.properties ?? {};
    const rawId = properties.id ?? feature.id;
    const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId).trim() : "";
    const name = typeof properties.name === "string" ? properties.name.trim() : "";
    const countryId = typeof properties.countryId === "string" ? properties.countryId.trim() : "";
    if (!id || !name || !countryId) {
      throw new Error(`Feição ${index + 1}: properties.id, properties.name e properties.countryId são obrigatórios.`);
    }
    if (seenIds.has(id)) throw new Error(`ID territorial duplicado: "${id}".`);
    seenIds.add(id);

    const ring = feature.geometry.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isFinitePosition)) {
      throw new Error(`Território "${name}": o anel externo precisa ter ao menos quatro posições válidas.`);
    }
    const points = ring.map(position => [position[0], position[1]] as [number, number]);
    if (polygonArea(points) <= 0) throw new Error(`Território "${name}": polígono sem área válida.`);
    const center: [number, number] = [
      points.reduce((sum, p) => sum + p[0], 0) / points.length,
      points.reduce((sum, p) => sum + p[1], 0) / points.length
    ];
    const population = Number(properties.population ?? 0);
    const production = Number(properties.production ?? 0);
    if (!Number.isFinite(population) || population < 0 || !Number.isFinite(production) || production < 0) {
      throw new Error(`Território "${name}": população e produção precisam ser números não negativos.`);
    }

    return {
      id, name, countryId, points, center, population, production,
      terrain: typeof properties.terrain === "string" ? properties.terrain : "Não definido",
      ...(typeof properties.regionName === "string" ? { regionName: properties.regionName } : {})
    };
  });
}
