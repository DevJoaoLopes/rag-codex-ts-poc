# 06 - Ollama Local

## O que e
Ollama e um runtime local para executar modelos de linguagem e embeddings sem depender de API externa.

## Por que importa
Na PoC, usar Ollama local reduz dependencia externa, facilita testes offline e acelera iteracao.

## Como aplicamos na PoC
Configuracao explicita usada no projeto:

- `OLLAMA_BASE_URL=http://localhost:11435/api`
- Endpoint de embeddings: `POST /api/embed`
- Modelo de chat: `llama3.1:8b`
- Modelo de embeddings: `nomic-embed-text` (somente embeddings)

Comandos recomendados:

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

Observacao importante:
- usar `llama3.1:8b` para geracao de resposta
- usar `nomic-embed-text` apenas para gerar embeddings

## Armadilhas comuns
- Misturar modelo de chat com modelo de embeddings sem separar responsabilidades.
- Configurar base URL sem o sufixo `/api` esperado na aplicacao.
- Esquecer de baixar modelos antes de rodar ingest/query.
- Rodar endpoint errado para embeddings (deve ser `POST /api/embed`).
