# 99 - Validation Report (RAG PoC)

## Checklist de validação
- [x] README e `/docs` explicam RAG, embeddings, chunking, top-k, vector store, Ollama e arquitetura.
- [x] `docs/06-ollama.md` menciona `OLLAMA_BASE_URL=http://localhost:11435/api`, modelos `llama3.1:8b` e `nomic-embed-text`, e endpoint `POST /api/embed`.
- [x] `.env.example` contém defaults corretos.
- [x] Dataset mínimo criado em `./data/documents`.
- [x] Smoke test automatizado (ingest + retrieve + /api/chat) criado.
- [ ] Validação manual UI (não executada nesta rodada).

## Comandos executados e resultados
- `pnpm install` ✅ (com aviso de scripts ignorados pelo pnpm).
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm smoke -- --reset` ❌ (falha: Ollama inacessível no ambiente local do teste).

## Problemas encontrados e correções
1. **Ausência de dataset mínimo em `./data/documents`.**
   - Correção: adicionados dois arquivos Markdown determinísticos para testes básicos.

2. **Ausência de smoke test end-to-end.**
   - Correção: criado `scripts/smoke.ts` com ingest, retrieve e validação HTTP do `/api/chat`.
   - Script permite `--reset` e faz cleanup do dev server.

3. **Ingestão reutilizável para CLI e smoke.**
   - Correção: extraída lógica para `lib/rag/ingest/ingestDocuments.ts`, usada pelo CLI e pelo smoke.

## Próximos passos sugeridos
- Adicionar reranking (cross-encoder leve) para melhorar precisão.
- Explorar busca híbrida (BM25 + vetorial) para recall.
- Planejar fase 2 com `pgvector` ou store persistente externo.
- Criar conjunto de avaliações (golden set) e métricas automáticas.
