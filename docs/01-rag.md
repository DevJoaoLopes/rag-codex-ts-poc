# 01 - RAG

## O que e
RAG (Retrieval-Augmented Generation) e uma abordagem em que o modelo gera respostas usando contexto recuperado de uma base de conhecimento.

Em vez de depender apenas dos pesos do modelo, o sistema busca trechos relevantes e os injeta no prompt.

## Por que importa
RAG existe para resolver dores comuns de LLM puro:
- conhecimento desatualizado
- respostas genericas
- maior risco de alucinacao

Com recuperacao, ganhamos:
- rastreabilidade da resposta (qual trecho suportou a geracao)
- atualizacao de conhecimento sem retreino
- melhor controle de dominio

## Como aplicamos na PoC
Fluxo principal:
1. Ingest: quebrar documentos em chunks e gerar embeddings.
2. Retrieve: comparar embedding da pergunta com embeddings dos chunks.
3. Generate: enviar pergunta + contexto recuperado para o modelo de chat.

Na pratica, a qualidade da resposta depende mais da recuperacao do que do prompt "bonito".

## Armadilhas comuns
- Tentar compensar recuperacao ruim com prompt engineering excessivo.
- Recuperar texto demais e estourar contexto.
- Nao filtrar trechos irrelevantes antes da geracao.
- Assumir que RAG elimina 100% das alucinacoes.
