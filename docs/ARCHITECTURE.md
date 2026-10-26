# Arquitetura do Age of History

Este documento registra a arquitetura atual do protótipo e as fronteiras que devem ser preservadas ao expandir o **Modo História**. Ele descreve o estado real do código, não funcionalidades futuras.

## Camadas atuais

- **Interface e navegação — `src/App.tsx`, `src/pages/`, `src/components/`**: controla páginas, seleção de país/território, opções da campanha, velocidade do tempo, importação de mapas e comandos de salvar/carregar. O portal usa `PortalPage` para início, exploração, sobre, detalhes do cenário, seleção da entidade e configuração final. O fluxo de configuração grava nome, cenário, modo, dificuldade e perfil de IA no estado da campanha; perfis externos de IA continuam sendo apenas metadados até existir uma integração real.
- **Simulação — `src/game/simulation.ts`**: aplica as regras de avanço diário e os marcos semanais, mensais e anuais. As regras devem ser funções determinísticas: dado o mesmo estado e a mesma ação, devem produzir o mesmo resultado.
- **Contratos de dados — `src/game/types.ts`**: define `GameState`, `Country`, `Territory` e `GameEvent`. Alterações nesses contratos precisam considerar campanhas salvas existentes.
- **Cenário inicial — `src/data/scenario.ts`**: cria o estado inicial do protótipo e seus dados demonstrativos. O catálogo visual do portal fica separado em `src/data/portalScenarios.ts`; opções de dificuldade e perfil de IA ficam em `src/data/campaignOptions.ts`. O catálogo visual ainda não representa mapas históricos jogáveis reais.
- **Mapa e importação — `src/map/WorldMap.tsx`, `src/map/geoJson.ts`**: desenha territórios e trata interação visual; o importador valida GeoJSON e converte feições em `Territory`. O mapa não deve alterar diretamente economia, população ou propriedade política.
- **Persistência — `src/persistence/saveGame.ts`**: salva e carrega campanhas localmente. Mudanças no esquema precisam de normalização/migração para não quebrar saves anteriores.

## Fluxo de uma campanha

1. `createInitialState()` fornece os dados do cenário.
2. A configuração da campanha escolhe o país jogável e aplica personalização à cópia do estado.
3. O jogador inicia com o tempo pausado.
4. Quando o tempo está ativo, o relógio da interface chama o avanço de um dia em intervalos definidos pela velocidade escolhida.
5. A simulação atualiza os sistemas implementados e acrescenta relatórios/eventos ao estado.
6. Salvar e carregar são operações explícitas; carregar e importar mapas deixam a campanha pausada.

## Regras de dependência

- Os módulos de simulação não devem importar componentes React ou PixiJS.
- Os componentes de interface não devem duplicar fórmulas de simulação.
- A importação de conteúdo precisa validar o arquivo inteiro antes de substituir dados ativos.
- Identificadores estáveis (`id`) ligam territórios a países e seleções da interface.
- Não recalcular totais nacionais a partir dos territórios até que o modelo defina explicitamente quais campos são derivados; atualmente, os dados demonstrativos não são garantidos como soma exata.
- O Modo Cidadão permanece fora do escopo das próximas entregas do Modo História; campos legados opcionais devem continuar compatíveis enquanto existirem saves que os utilizem.

## Próximas fronteiras planejadas

- Conectar a fila determinística de `src/game/simulation.ts` aos sistemas de diplomacia, economia e guerra; a infraestrutura de prioridade/pausa já existe, mas esses subsistemas ainda não agendam eventos próprios.
- Formalizar funções puras de regras e cobri-las com testes automatizados.
- Manter a validação de estado na fronteira de persistência e importação, ampliando-a conforme novos campos e eventos forem adicionados.
- Só mover cálculos para Web Workers quando medições demonstrarem necessidade e o contrato de mensagens estiver definido.

## Compatibilidade de salvamentos

A política e as versões atuais estão documentadas em [`docs/SAVE_COMPATIBILITY.md`](./SAVE_COMPATIBILITY.md). Não há migração real entre versões diferentes de `GameState` ainda.

## Limitações conhecidas

- O importador GeoJSON ainda ignora buracos internos de polígonos.
- A seleção territorial usa as interações gráficas do PixiJS; os buracos internos e as partes desconectadas são preservados, mas a validação visual de geometrias complexas e enclaves sobrepostos ainda é necessária.
- A simulação atual é demonstrativa: relatórios agregados e ticks estão testados, mas tributação, dívida, cadeias produtivas, comércio, infraestrutura e dinâmica demográfica completa ainda não estão implementados. Os perfis externos de IA são metadados de configuração, sem integração de provedores.


## Organização de estilos e componentes

- **Estilos globais**: `src/styles/reset.css`, `variables.css` e `global.css` separam reset, tokens e regras compartilhadas.
- **Estilos por página**: `src/pages/home/`, `src/pages/gameplay/` e `src/pages/setup/` mantêm CSS específico junto à tela correspondente.
- **Cabeçalho compartilhado**: `src/components/header/Header.tsx` e `Header.css` oferecem variantes para o portal e para as telas legadas de configuração/gameplay.
- **Componentes reutilizáveis**: `src/components/ui/` contém controles visuais como `StatCard`.
- **Hooks**: `src/hooks/` guarda efeitos React reutilizáveis, como o relógio da simulação.\n- **Portal e descoberta de cenários**: `src/pages/PortalPage.tsx` reúne os fluxos de início, home, sobre, detalhe do cenário, seleção de entidade e configuração da partida; `src/pages/portal/PortalPage.css` concentra seus estilos. Cenários exibidos no portal ainda são demonstrações e não estão ligados a um catálogo histórico real.\n- **Metadados de campanha**: `GameState` admite identificadores de cenário, modo, versão, dificuldade e perfil de IA. Salvamentos antigos sem esses campos recebem valores de compatibilidade explícitos durante a normalização.
