# Política de compatibilidade de salvamentos

Este documento descreve o comportamento implementado no protótipo do Age of History. Não promete compatibilidade que ainda não existe.

## Versões atuais

| Camada | Identificador atual | Comportamento |
| --- | --- | --- |
| Estado da campanha | `schemaVersion: 1` | O carregador valida os campos de países, territórios, geometria, seleção, eventos e metadados opcionais. |
| Registro local | `storageVersion: 1` | Metadados de slot e versão ficam no IndexedDB; a gravação valida o estado antes de abrir a transação de escrita. |
| Banco local | IndexedDB versão `2` | Armazena autosave e slots manuais separadamente. |
| Exportação de campanha | `age-of-history-campaign`, `formatVersion: 1` | Importação valida o envelope e o estado antes de substituir a campanha em memória. |
| Recuperação bruta | `age-of-history-raw-save-recovery` | Importa uma cópia validada do registro exportado; não grava sobre o registro original. |

## Compatibilidade legada

- Registros locais sem `storageVersion` são tratados como formato legado, mas ainda precisam conter um estado de campanha válido com `schemaVersion: 1`.
- Campos opcionais recentes (cenário, modo, versão do jogo, dificuldade, perfil de IA e fila de eventos) recebem valores de compatibilidade quando ausentes.
- Metadados desconhecidos do armazenamento local não são considerados parte do estado de jogo.
- Uma versão de registro local explicitamente desconhecida ou um `schemaVersion` incompatível é rejeitado com mensagem clara. O registro original não é sobrescrito pelo carregamento.
- Arquivos JSON com formato ou versão de exportação desconhecidos são rejeitados antes de alterar o estado ativo.

## Regras para futuras alterações incompatíveis

1. Aumentar a versão do esquema somente quando a forma ou o significado dos dados persistidos mudar de maneira incompatível.
2. Implementar uma função de migração pura por versão de origem, com entrada e saída validadas.
3. Executar a migração em uma cópia; nunca alterar o registro original durante uma leitura.
4. Validar o estado migrado antes de torná-lo ativo ou gravá-lo.
5. Manter fixtures e testes para cada versão antiga suportada, incluindo falhas de migração.
6. Se não existir migração segura, rejeitar o arquivo explicando a incompatibilidade e preservar a fonte.
7. Não remover campos antigos enquanto existirem versões suportadas que dependam deles sem uma migração explícita.

## Limitações conhecidas

A versão atual **não implementa migrações reais entre versões diferentes de `GameState`**: somente o esquema 1 é aceito. Os valores padrão para novos campos preservam compatibilidade com campanhas antigas do esquema 1, mas não equivalem a migrar um esquema antigo desconhecido. Ainda faltam testes de ciclo de vida com IndexedDB real/falso cobrindo salvar, reiniciar, carregar, migrar e retomar uma campanha longa.
