# rag-codex-ts-poc

Scaffold de uma PoC de RAG com Next.js (App Router) em TypeScript e Ollama local.

## Requisitos

- Node.js >= 20
- pnpm
- Ollama rodando local em `http://localhost:11435`

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
