import type { Territory } from "../game/types";

type GeoJsonPolygon = { type: "Polygon"; coordinates: number[][][] };
type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: GeoJsonPolygon | { type: string; coordinates?: unknown } | null;
};
type GeoJsonFeatureCollection = { type: "FeatureCollection"; features: GeoJsonFeature[] };

function isFinitePosition(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]);
}
function polygonArea(points: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area / 2);
}

/** Importa GeoJSON FeatureCollection de Polygon para o modelo territorial do protótipo. */
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
    if (feature.geometry.type !== "Polygon") {
      throw new Error(`Feição ${index + 1}: apenas Polygon é suportado por enquanto; MultiPolygon/ilhas serão adicionados depois.`);
    }
    const properties = feature.properties ?? {};
    const rawId = properties.id ?? feature.id;
    const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId).trim() : "";
    const name = typeof properties.name === "string" ? properties.name.trim() : "";
    const countryId = typeof properties.countryId === "string" ? properties.countryId.trim() : "";
    if (!id || !name || !countryId) throw new Error(`Feição ${index + 1}: properties.id, properties.name e properties.countryId são obrigatórios.`);
    if (seenIds.has(id)) throw new Error(`ID territorial duplicado: "${id}".`);
    if (validCountryIds && !validCountryIds.has(countryId)) throw new Error(`Território "${name}": countryId "${countryId}" não corresponde a nenhum país da campanha atual.`);
    seenIds.add(id);

    const coordinates = feature.geometry.coordinates;
    const ring = Array.isArray(coordinates) ? coordinates[0] : undefined;
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isFinitePosition)) {
      throw new Error(`Território "${name}": o anel externo precisa ter ao menos quatro posições válidas.`);
    }
    const points = ring.map(position => [position[0], position[1]] as [number, number]);
    if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) points.push([...points[0]]);
    const openRing = points.slice(0, -1);
    if (openRing.length < 3 || polygonArea(openRing) <= 0) throw new Error(`Território "${name}": polígono sem área válida.`);

    const population = Number(properties.population ?? 0);
    const production = Number(properties.production ?? 0);
    if (!Number.isFinite(population) || population < 0 || !Number.isFinite(production) || production < 0) {
      throw new Error(`Território "${name}": população e produção precisam ser números não negativos.`);
    }
    const center: [number, number] = [
      openRing.reduce((sum, p) => sum + p[0], 0) / openRing.length,
      openRing.reduce((sum, p) => sum + p[1], 0) / openRing.length
    ];
    return {
      id, name, countryId, points, center, population, production,
      terrain: typeof properties.terrain === "string" ? properties.terrain : "Não definido",
      ...(typeof properties.regionName === "string" ? { regionName: properties.regionName } : {})
    };
  });
}
