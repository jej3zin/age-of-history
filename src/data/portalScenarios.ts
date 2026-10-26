export type PortalScenario = {
  id: string;
  title: string;
  category: string;
  description: string;
  players: string;
  rating: string;
  cover: string;
};

/** Dados demonstrativos do catálogo; ainda não são cenários jogáveis históricos reais. */
export const portalScenarios: PortalScenario[] = [
  { id: "ww1", title: "Primeira Guerra Mundial", category: "HISTÓRICO · 1914", description: "Redesenhe o equilíbrio de poder em uma Europa à beira do conflito.", players: "12,4 mil", rating: "4,9", cover: "ww1" },
  { id: "ww2", title: "Segunda Guerra Mundial", category: "HISTÓRICO · 1936", description: "Comande uma nação durante o conflito que transformou o século XX.", players: "18,7 mil", rating: "4,8", cover: "ww2" },
  { id: "modern", title: "Mundo Moderno", category: "OFICIAL · 2025", description: "Um mapa contemporâneo para explorar diplomacia, economia e expansão.", players: "9,2 mil", rating: "4,7", cover: "modern" },
  { id: "ancient", title: "Impérios Antigos", category: "OFICIAL · 500 a.C.", description: "Construa um legado entre as grandes civilizações da Antiguidade.", players: "6,1 mil", rating: "4,6", cover: "ancient" },
];
