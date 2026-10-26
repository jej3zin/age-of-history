# Arquitetura do Age of History

Este documento registra a arquitetura atual do protótipo e as fronteiras que devem ser preservadas ao expandir o **Modo História**. Ele descreve o estado real do código, não funcionalidades futuras.

## Camadas atuais

- **Interface e navegação — `src/App.tsx`, `src/pages/`, `src/components/`**: controla páginas, seleção de país/território, velocidade do tempo, importação de mapas e comandos de salvar/carregar. A interface deve apresentar estado e encaminhar ações, evitando implementar regras econômicas diretamente nos componentes.
- **Simulação — `src/game/simulation.ts`**: aplica as regras de avanço diário e os marcos semanais, mensais e anuais. As regras devem ser funções determinísticas: dado o mesmo estado e a mesma ação, devem produzir o mesmo resultado.
- **Contratos de dados — `src/game/types.ts`**: define `GameState`, `Country`, `Territory` e `GameEvent`. Alterações nesses contratos precisam considerar campanhas salvas existentes.
- **Cenário inicial — `src/data/scenario.ts`**: cria o estado inicial e os dados demonstrativos. Dados de cenário devem permanecer separados das regras de simulação.
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

- Introduzir eventos de domínio e uma fila determinística antes de adicionar decisões que interrompam o tempo.
- Formalizar funções puras de regras e cobri-las com testes automatizados.
- Adicionar validação de estado na fronteira de persistência e importação.
- Só mover cálculos para Web Workers quando medições demonstrarem necessidade e o contrato de mensagens estiver definido.

## Limitações conhecidas

- O importador GeoJSON ainda ignora buracos internos de polígonos.
- A seleção territorial usa as interações gráficas do PixiJS; testes automatizados e validação visual de geometrias complexas ainda são necessários.
- A simulação atual é demonstrativa e não representa ainda um modelo econômico ou demográfico completo.
