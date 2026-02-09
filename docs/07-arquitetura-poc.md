# 07 - Arquitetura da PoC

## O que e
A arquitetura desta PoC organiza o fluxo de RAG em modulos separados para facilitar entendimento, manutencao e evolucao.

## Por que importa
Separar responsabilidades evita acoplamento e permite trocar componentes (modelo, store, estrategia de chunking) com impacto controlado.

## Como aplicamos na PoC
Visao por areas do repositorio:
- `app/`: interface e camada web (Next.js App Router)
- `scripts/`: fluxos operacionais (ingest e query)
- `lib/`: contratos, adaptadores e logica compartilhada
- `data/`: dados de entrada para experimentos
- `tests/`: validacoes automatizadas da base
- `docs/`: material didatico da PoC

Interfaces recomendadas na evolucao:
- `EmbeddingProvider`: gera embedding para texto
- `VectorStore`: indexa e consulta vetores
- `Retriever`: aplica top-k e retorna contexto
- `Generator`: chama modelo de chat com contexto

Decisoes arquiteturais da PoC:
- priorizar legibilidade e modularidade sobre performance maxima
- manter pipeline explicito (ingest -> retrieve -> generate)
- preparar troca incremental de componentes sem refatoracao ampla

## Armadilhas comuns
- Deixar scripts concentrarem regra de negocio sem extrair para modulos.
- Interfaces abstratas demais cedo, sem uso real.
- Ignorar contrato de dados entre ingestao e recuperacao.
- Nao registrar decisoes tecnicas (tradeoffs) ao longo da evolucao.
