# rag-codex-ts-poc

Scaffold de uma PoC de RAG com Next.js (App Router) em TypeScript e Ollama local.

## Requisitos

- Node.js >= 20
- pnpm
- Ollama rodando local em `http://localhost:11435`

## Configuracao Ollama (PoC)

Base URL usada pela PoC:

- `OLLAMA_BASE_URL=http://localhost:11435/api`

Modelos usados:

- Chat: `llama3.1:8b`
- Embeddings: `nomic-embed-text` (somente embeddings)

Endpoint de embeddings:

- `POST /api/embed`

Baixe os modelos antes de rodar ingest/query:

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

## Como rodar o app

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000` no navegador.

Build de producao:

```bash
pnpm build
pnpm start
```

## Scripts uteis

- `pnpm lint`: roda ESLint
- `pnpm format`: roda Prettier
- `pnpm test`: roda Vitest

## Ingest e Query (placeholders)

```bash
pnpm ingest
pnpm query
```

Os scripts estao em:

- `scripts/ingest.ts`
- `scripts/query.ts`

Nesta etapa, o RAG ainda nao foi implementado; apenas o scaffold e estrutura.
