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

## Dados para RAG

Adicione arquivos `.md` e/ou `.txt` em `./data/documents` (subpastas sao suportadas).

Exemplo:

```bash
mkdir -p data/documents/manual
echo "# Guia\n\nConteudo de exemplo." > data/documents/manual/guia.md
```

## Ingest e Query

```bash
pnpm ingest
pnpm query -- "Qual e o conteudo do guia?" --topK 8
```

Opcoes do ingest:

- `--dir <path>`: diretório raiz dos documentos (default `./data/documents`)
- `--reset`: limpa o storage antes da ingestao
- `--limit <n>`: limita quantidade de documentos para debug

Exemplo com reset e limite:

```bash
pnpm ingest -- --reset --limit 10
```

Os scripts estao em `scripts/ingest.ts` e `scripts/query.ts`.
