# Como rodar ingest

Este documento descreve o fluxo mínimo para ingestão de documentos na PoC.

## Passo a passo
1. Garanta que o Ollama esteja rodando em `http://localhost:11435`.
2. Verifique se os documentos estão em `./data/documents`.
3. Execute `pnpm ingest -- --reset` para limpar o storage e reprocessar tudo.
4. Confirme que o arquivo `./data/storage/in-memory-vector-store.json` foi criado.

## Dica rápida
Se quiser limitar a ingestão para poucos arquivos, use `--limit 1`.
