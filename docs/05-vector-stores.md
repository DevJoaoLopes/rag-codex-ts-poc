# 05 - Vector Stores

## O que e
Vector store e um armazenamento especializado para vetores e busca por similaridade.

Pode ser:
- in-memory (simples, rapido para PoC, nao persiste)
- persistente (mantem dados entre execucoes e escala melhor)

## Por que importa
Sem vector store, a recuperacao fica limitada ou cara conforme volume cresce.

Um store adequado permite:
- indexacao eficiente
- consulta rapida
- evolucao para filtros e metadados

## Como aplicamos na PoC
Fase inicial:
- estrutura simples local para entender fluxo e qualidade
- foco em clareza de interfaces de ingestao e busca

Evolucao sugerida:
1. Isolar contrato da camada de store.
2. Trocar implementacao in-memory por persistente sem quebrar modulos.
3. Adicionar metadados e filtros.
4. Introduzir estrategia de reindexacao/versionamento.

## Armadilhas comuns
- Acoplar logica de negocio ao provider de armazenamento.
- Nao guardar metadados de origem do chunk.
- Ignorar custo de reindexacao ao trocar modelo de embedding.
- Escalar volume sem observabilidade de latencia e recall.
