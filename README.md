# Age of History — protótipo jogável

Fundação inicial do simulador geopolítico **Age of History**, executado localmente no navegador.

## Tecnologias
- React + TypeScript + Vite
- PixiJS para o mapa político interativo
- IndexedDB para salvamento local

## Requisitos
Node.js 20+ e npm.

## Executar no EndeavourOS
```bash
sudo pacman -S nodejs npm
npm install
npm run dev
```
Abra o endereço local informado pelo Vite (normalmente http://localhost:5173).

## Fundação atual
- Cenário fictício com 3 países e 6 territórios.
- Seleção de territórios no mapa.
- Avanço de tempo diário, orçamento, população e produção simplificados.
- Registro de eventos mensais.
- Salvar e carregar campanha no navegador usando IndexedDB.

Os números e países são dados de teste. Ainda não representam a simulação completa definida no GDD.
