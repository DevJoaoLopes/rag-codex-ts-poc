# 00 - Overview da PoC

## O que e
Esta Proof of Concept (PoC) demonstra um pipeline basico de RAG (Retrieval-Augmented Generation) em TypeScript, com interface web em Next.js e execucao local com Ollama.

A ideia central e combinar:
- ingestao de conteudo (documentos fonte)
- indexacao vetorial (embeddings)
- recuperacao por similaridade
- geracao de resposta contextualizada

## Por que importa
RAG reduz alucinacao e aumenta relevancia ao trazer contexto real para o modelo no momento da resposta.

Para estudo, esta PoC ajuda a entender:
- limites de LLM puro versus LLM com recuperacao
- impacto de chunking e top-k na qualidade
- tradeoffs de arquitetura antes de escalar para producao

## Como aplicamos na PoC
Nesta PoC, o foco e aprender arquitetura e fluxo ponta a ponta antes de otimizar performance.

Fluxo alvo:
1. Ler dados fonte.
2. Gerar embeddings dos chunks.
3. Armazenar vetores em estrutura simples.
4. Buscar trechos mais similares para uma pergunta.
5. Montar prompt com contexto e chamar modelo de chat.

Escopo do estudo:
- rodar local
- validar qualidade funcional
- manter componentes desacoplados para evolucao

## Armadilhas comuns
- Confundir PoC com produto final e tentar resolver tudo cedo demais.
- Medir sucesso apenas por "resposta bonita" sem avaliar recuperacao.
- Acoplar ingestao, busca e geracao no mesmo modulo.
- Ignorar observabilidade minima (logs de query, top-k e contexto retornado).

## Roadmap sugerido
1. Implementar fluxo funcional minimo (ingest -> retrieve -> generate).
2. Medir qualidade em perguntas conhecidas.
3. Ajustar chunking e top-k com base em erro real.
4. Trocar store em memoria por persistente.
5. Introduzir avaliacao automatizada e guardrails basicos.
